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

function getFileUrls(prop) {
  if (!prop?.files) return [];
  return prop.files.map(f => {
    if (f.type === 'file') return f.file.url;
    if (f.type === 'external') return f.external.url;
    return '';
  }).filter(Boolean);
}

// ── Transform Notion pages → frontend JSON ─────────────────────────────────

function transformBlogPost(page, index) {
  const p = page.properties;
  const date = getDateValue(p['日期']);
  // Format date: "2025-03-18" → "2025.03.18"
  const formattedDate = date ? date.substring(0, 10).replace(/-/g, '.') : '';

  return {
    id: `post-${String(index + 1).padStart(3, '0')}`,
    date: formattedDate,
    title: getPlainText(p['标题']),
    summary: getPlainText(p['摘要']),
    category: getSelectValue(p['分类']),
    images: getFileUrls(p['图片']),
    content: getPlainText(p['内容']),
  };
}

function transformWork(page, index) {
  const p = page.properties;

  return {
    id: `work-${String(index + 1).padStart(3, '0')}`,
    title: getPlainText(p['项目标题']),
    year: String(getNumberValue(p['项目年份']) || ''),
    category: getSelectValue(p['分类']),
    type: getSelectValue(p['类型']),
    thumbnail: getFileUrls(p['缩略图'])[0] || '',
    images: getFileUrls(p['图片/视频']),
    tags: getMultiSelectValues(p['标签']),
    description: getPlainText(p['描述']),
  };
}

function transformBanner(page, index) {
  const p = page.properties;
  return {
    id: `banner-${String(index + 1).padStart(3, '0')}`,
    title: getPlainText(p['标题']),
    subtitle: getPlainText(p['副标题']),
    image: getFileUrls(p['图片'])[0] || '',
    link: p['跳转链接']?.url || '',
    order: getNumberValue(p['顺序']),
  };
}

function transformTimeline(page, index) {
  const p = page.properties;
  const dateStr = getDateValue(p['时间']); // ISO yyyy-mm-dd
  return {
    id: `tl-${String(index + 1).padStart(3, '0')}`,
    date: dateStr,
    year: dateStr ? dateStr.substring(0, 4) : '',
    title: getPlainText(p['标题']),
    subtitle: getPlainText(p['副标题']),
    images: getFileUrls(p['图片']),
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

    try {
      if (path === '/blog') {
        const pages = await queryDatabase(env.NOTION_BLOG_DB, env.NOTION_TOKEN);
        // Sort by date descending
        const posts = pages.map((p, i) => transformBlogPost(p, i));
        posts.sort((a, b) => b.date.localeCompare(a.date));
        // Re-index after sort
        posts.forEach((p, i) => { p.id = `post-${String(i + 1).padStart(3, '0')}`; });

        return new Response(JSON.stringify(posts), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }

      if (path === '/works') {
        const pages = await queryDatabase(env.NOTION_WORKS_DB, env.NOTION_TOKEN);
        const works = pages.map((p, i) => transformWork(p, i));

        return new Response(JSON.stringify(works), {
          headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
        });
      }

      if (path === '/timeline') {
        const pages = await queryDatabase(env.NOTION_TIMELINE_DB, env.NOTION_TOKEN);
        const items = pages.map((p, i) => transformTimeline(p, i));
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
        const banners = pages.map((p, i) => transformBanner(p, i)).filter(b => b.image);
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
