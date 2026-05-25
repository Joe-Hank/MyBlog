/**
 * MyBlog Notion Proxy — Cloudflare Worker
 * Reads blog posts and works from Notion databases,
 * transforms them into the JSON format the frontend expects.
 */

// ── CORS ───────────────────────────────────────────────────────────────────

function corsHeaders(origin, allowed) {
  // Allow GitHub Pages + localhost dev
  const ok = origin === allowed
    || origin === 'http://localhost:5500'
    || origin === 'http://127.0.0.1:5500'
    || origin?.startsWith('http://localhost:');
  return {
    'Access-Control-Allow-Origin': ok ? origin : allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

// ── Notion API helpers ─────────────────────────────────────────────────────

async function queryDatabase(dbId, notionToken) {
  const pages = [];
  let cursor = undefined;

  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion API ${res.status}: ${text}`);
    }

    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return pages;
}

function getPlainText(prop) {
  if (!prop) return '';
  // title or rich_text type
  const arr = prop.title || prop.rich_text;
  if (!arr || arr.length === 0) return '';
  return arr.map(t => t.plain_text).join('');
}

function getSelectValue(prop) {
  return prop?.select?.name || '';
}

function getMultiSelectValues(prop) {
  if (!prop?.multi_select) return [];
  return prop.multi_select.map(s => s.name);
}

function getDateValue(prop) {
  return prop?.date?.start || '';
}

function getNumberValue(prop) {
  return prop?.number ?? null;
}

function getFileUrls(prop, mirrorBase) {
  if (!prop?.files) return [];
  return prop.files.map(f => {
    if (f.type === 'file') return rewriteFileUrl(f.file.url, mirrorBase);
    if (f.type === 'external') return f.external.url;
    return '';
  }).filter(Boolean);
}

// ── Notion S3 → GitHub Pages mirror ────────────────────────────────────────
// Notion-hosted attachments are served via short-lived (1 h) AWS S3 pre-signed
// URLs. We mirror them into the repo (src/assets/notion/<file-id>.<ext>) and
// rewrite outgoing URLs to that stable GitHub Pages location so visitors don't
// hit 403 when the signed URL expires. Pass mirrorBase = null/empty (or
// request /endpoint?raw=1) to skip rewrite — used by the sync script.
function rewriteFileUrl(url, mirrorBase) {
  if (!url || !mirrorBase) return url;
  try {
    const u = new URL(url);
    if (!u.hostname.includes('amazonaws.com')) return url;
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length < 2) return url;
    const fileId = segs[segs.length - 2];
    const filename = decodeURIComponent(segs[segs.length - 1]);
    const dot = filename.lastIndexOf('.');
    const ext = dot >= 0 ? filename.substring(dot).toLowerCase() : '';
    if (!ext) return url;
    return `${mirrorBase.replace(/\/$/, '')}/${fileId}${ext}`;
  } catch {
    return url;
  }
}

// ── Page body → Markdown ───────────────────────────────────────────────────

async function fetchBlockChildren(blockId, notionToken) {
  const blocks = [];
  let cursor;
  do {
    const url = new URL(`https://api.notion.com/v1/blocks/${blockId}/children`);
    url.searchParams.set('page_size', '100');
    if (cursor) url.searchParams.set('start_cursor', cursor);
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Notion-Version': '2022-06-28',
      },
    });
    if (!res.ok) throw new Error(`Notion blocks ${res.status}: ${await res.text()}`);
    const data = await res.json();
    blocks.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

function richTextToMd(rtArr) {
  if (!rtArr || !rtArr.length) return '';
  return rtArr.map(rt => {
    let t = rt.plain_text || '';
    if (!t) return '';
    const a = rt.annotations || {};
    if (a.code) t = '`' + t + '`';
    if (a.bold) t = '**' + t + '**';
    if (a.italic) t = '*' + t + '*';
    if (a.strikethrough) t = '~~' + t + '~~';
    if (rt.href) t = '[' + t + '](' + rt.href + ')';
    return t;
  }).join('');
}

async function blockToMd(block, notionToken, mirrorBase, depth = 0) {
  const t = block.type;
  const indent = '  '.repeat(depth);

  switch (t) {
    case 'paragraph':
      return richTextToMd(block.paragraph.rich_text) + '\n\n';
    case 'heading_1':
      return '# ' + richTextToMd(block.heading_1.rich_text) + '\n\n';
    case 'heading_2':
      return '## ' + richTextToMd(block.heading_2.rich_text) + '\n\n';
    case 'heading_3':
      return '### ' + richTextToMd(block.heading_3.rich_text) + '\n\n';
    case 'bulleted_list_item': {
      let out = indent + '- ' + richTextToMd(block.bulleted_list_item.rich_text) + '\n';
      if (block.has_children) {
        const kids = await fetchBlockChildren(block.id, notionToken);
        for (const k of kids) out += await blockToMd(k, notionToken, mirrorBase, depth + 1);
      }
      return out;
    }
    case 'numbered_list_item': {
      let out = indent + '1. ' + richTextToMd(block.numbered_list_item.rich_text) + '\n';
      if (block.has_children) {
        const kids = await fetchBlockChildren(block.id, notionToken);
        for (const k of kids) out += await blockToMd(k, notionToken, mirrorBase, depth + 1);
      }
      return out;
    }
    case 'to_do': {
      const box = block.to_do.checked ? '[x]' : '[ ]';
      return indent + '- ' + box + ' ' + richTextToMd(block.to_do.rich_text) + '\n';
    }
    case 'quote':
      return '> ' + richTextToMd(block.quote.rich_text) + '\n\n';
    case 'callout':
      return '> ' + richTextToMd(block.callout.rich_text) + '\n\n';
    case 'code': {
      const lang = block.code.language || '';
      const text = (block.code.rich_text || []).map(rt => rt.plain_text).join('');
      return '```' + lang + '\n' + text + '\n```\n\n';
    }
    case 'divider':
      return '---\n\n';
    case 'image': {
      const img = block.image;
      const rawUrl = img.type === 'external' ? img.external.url : img.file.url;
      const u = img.type === 'file' ? rewriteFileUrl(rawUrl, mirrorBase) : rawUrl;
      const cap = richTextToMd(img.caption || []);
      return '![' + cap + '](' + u + ')\n\n';
    }
    case 'table': {
      if (!block.has_children) return '';
      const rows = await fetchBlockChildren(block.id, notionToken);
      const lines = [];
      rows.forEach((row, i) => {
        if (row.type !== 'table_row') return;
        const cells = row.table_row.cells.map(cell => richTextToMd(cell).replace(/\n/g, ' ').replace(/\|/g, '\\|'));
        lines.push('| ' + cells.join(' | ') + ' |');
        if (i === 0) lines.push('|' + cells.map(() => '---').join('|') + '|');
      });
      return lines.join('\n') + '\n\n';
    }
    case 'toggle': {
      let out = richTextToMd(block.toggle.rich_text) + '\n\n';
      if (block.has_children) {
        const kids = await fetchBlockChildren(block.id, notionToken);
        for (const k of kids) out += await blockToMd(k, notionToken, mirrorBase, depth);
      }
      return out;
    }
    case 'bookmark':
    case 'embed':
    case 'video':
    case 'file': {
      const rawU = block[t]?.url || block[t]?.external?.url || block[t]?.file?.url || '';
      const u = block[t]?.file?.url ? rewriteFileUrl(rawU, mirrorBase) : rawU;
      return u ? '[' + u + '](' + u + ')\n\n' : '';
    }
    default:
      return '';
  }
}

async function pageBodyToMarkdown(pageId, notionToken, mirrorBase) {
  const blocks = await fetchBlockChildren(pageId, notionToken);
  let md = '';
  for (const b of blocks) md += await blockToMd(b, notionToken, mirrorBase);
  return md.trim();
}

// ── Transform Notion pages → frontend JSON ─────────────────────────────────

async function transformBlogPost(page, index, notionToken, mirrorBase) {
  const p = page.properties;
  const date = getDateValue(p['日期']);
  const formattedDate = date ? date.substring(0, 10).replace(/-/g, '.') : '';

  // Read content from page body (markdown). Fallback to 内容 property if body is empty.
  let content = '';
  try {
    content = await pageBodyToMarkdown(page.id, notionToken, mirrorBase);
  } catch (e) {
    console.error('pageBodyToMarkdown failed for', page.id, e.message);
  }
  if (!content) content = getPlainText(p['内容']);

  return {
    id: `post-${String(index + 1).padStart(3, '0')}`,
    date: formattedDate,
    title: getPlainText(p['标题']),
    summary: getPlainText(p['摘要']),
    category: getSelectValue(p['分类']),
    images: getFileUrls(p['图片'], mirrorBase),
    content,
  };
}

async function transformWork(page, index, notionToken, mirrorBase) {
  const p = page.properties;

  // Read description from page body. Fallback to 描述 property if body is empty.
  let description = '';
  try {
    description = await pageBodyToMarkdown(page.id, notionToken, mirrorBase);
  } catch (e) {
    console.error('pageBodyToMarkdown failed for', page.id, e.message);
  }
  if (!description) description = getPlainText(p['描述']);

  return {
    id: `work-${String(index + 1).padStart(3, '0')}`,
    title: getPlainText(p['项目标题']),
    year: String(getNumberValue(p['项目年份']) || ''),
    category: getSelectValue(p['分类']),
    type: getSelectValue(p['类型']),
    thumbnail: getFileUrls(p['缩略图'], mirrorBase)[0] || '',
    images: getFileUrls(p['图片/视频'], mirrorBase),
    tags: getMultiSelectValues(p['标签']),
    description,
  };
}

function transformBanner(page, index, mirrorBase) {
  const p = page.properties;
  return {
    id: `banner-${String(index + 1).padStart(3, '0')}`,
    title: getPlainText(p['标题']),
    subtitle: getPlainText(p['副标题']),
    image: getFileUrls(p['图片'], mirrorBase)[0] || '',
    link: p['跳转链接']?.url || '',
    order: getNumberValue(p['顺序']),
  };
}

function transformTimeline(page, index, mirrorBase) {
  const p = page.properties;
  const dateStr = getDateValue(p['时间']); // ISO yyyy-mm-dd
  return {
    id: `tl-${String(index + 1).padStart(3, '0')}`,
    date: dateStr,
    year: dateStr ? dateStr.substring(0, 4) : '',
    title: getPlainText(p['标题']),
    subtitle: getPlainText(p['副标题']),
    images: getFileUrls(p['图片'], mirrorBase),
  };
}

// ── Request handler ────────────────────────────────────────────────────────

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGIN);

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    // Only GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    const path = url.pathname;

    // mirrorBase = null → emit raw Notion S3 URLs (used by sync-notion-images.ps1)
    // mirrorBase = MIRROR_BASE   → rewrite to stable GitHub Pages URLs
    const raw = url.searchParams.get('raw') === '1';
    const mirrorBase = raw ? null : (env.MIRROR_BASE || '');

    try {
      if (path === '/blog') {
        const pages = await queryDatabase(env.NOTION_BLOG_DB, env.NOTION_TOKEN);
        // Fetch page bodies concurrently
        const posts = await Promise.all(pages.map((p, i) => transformBlogPost(p, i, env.NOTION_TOKEN, mirrorBase)));
        // Sort by date descending
        posts.sort((a, b) => b.date.localeCompare(a.date));
        // Re-index after sort
        posts.forEach((p, i) => { p.id = `post-${String(i + 1).padStart(3, '0')}`; });

        return new Response(JSON.stringify(posts), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }

      if (path === '/works') {
        const pages = await queryDatabase(env.NOTION_WORKS_DB, env.NOTION_TOKEN);
        const works = await Promise.all(pages.map((p, i) => transformWork(p, i, env.NOTION_TOKEN, mirrorBase)));

        return new Response(JSON.stringify(works), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }

      if (path === '/timeline') {
        const pages = await queryDatabase(env.NOTION_TIMELINE_DB, env.NOTION_TOKEN);
        const items = pages.map((p, i) => transformTimeline(p, i, mirrorBase));
        // Sort by date descending (newest first); empty dates go to the end
        items.sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });
        items.forEach((it, i) => { it.id = `tl-${String(i + 1).padStart(3, '0')}`; });

        return new Response(JSON.stringify(items), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }

      if (path === '/banner') {
        const pages = await queryDatabase(env.NOTION_BANNER_DB, env.NOTION_TOKEN);
        const banners = pages.map((p, i) => transformBanner(p, i, mirrorBase)).filter(b => b.image);
        // Sort by 顺序 ascending (smaller first); null orders go to the end
        banners.sort((a, b) => {
          if (a.order == null && b.order == null) return 0;
          if (a.order == null) return 1;
          if (b.order == null) return -1;
          return a.order - b.order;
        });
        // Re-index after sort so banner-001 is the first displayed
        banners.forEach((b, i) => { b.id = `banner-${String(i + 1).padStart(3, '0')}`; });

        return new Response(JSON.stringify(banners), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }

      // Health check
      if (path === '/') {
        return new Response(JSON.stringify({ status: 'ok', endpoints: ['/blog', '/works', '/banner', '/timeline'] }), {
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not found', { status: 404, headers: cors });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  },
};
