/**
 * MyBlog Notion Proxy — Cloudflare Worker
 *
 * 将 Notion 数据库转换为博客前端所需的 JSON 格式，解决 CORS 和 API Key 安全问题。
 *
 * ===== 部署步骤 =====
 * 1. npm install -g wrangler
 * 2. cd workers/
 * 3. wrangler login
 * 4. 在 https://www.notion.so/my-integrations 创建 Integration，复制 Token
 * 5. 在 Notion 中将 Blog 和 Works 数据库「Share → Invite」该 Integration
 * 6. wrangler secret put NOTION_TOKEN   （粘贴 Token）
 * 7. 编辑 wrangler.toml，填入 BLOG_DB_ID 和 WORKS_DB_ID
 * 8. wrangler deploy
 * 9. 在 src/data/config.js 中填入 Worker URL
 *
 * ===== Notion 数据库属性要求 =====
 *
 * Blog 数据库:
 *   Title    (title)        文章标题
 *   Date     (date)         发布日期
 *   Category (select)       分类: AI提效 / 游戏平台 / 游戏制作 / 游戏交易 / UGC/AIGC / 虚拟现实
 *   Summary  (rich_text)    摘要
 *   Cover    (files)        封面图（可选，也可用页面 cover）
 *   页面正文                 自动转 HTML
 *
 * Works 数据库:
 *   Title     (title)        作品名称
 *   Year      (number)       年份
 *   Category  (select)       分类: 应用 / 游戏
 *   Tags      (multi_select) 标签
 *   Thumbnail (files)        缩略图
 *   Images    (files)        图片集
 *   页面正文                  自动转 HTML
 *
 * ===== API 端点 =====
 *   GET /blog   → 返回博客文章数组
 *   GET /works  → 返回作品数组
 */

const NOTION_API = 'https://api.notion.com/v1';

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    // 缓存检查（5 分钟）
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    let cached = await cache.match(cacheKey);
    if (cached) return cached;

    try {
      let data;
      if (path === '/blog')       data = await fetchBlog(env);
      else if (path === '/works') data = await fetchWorks(env);
      else return new Response('Not Found', { status: 404, headers: corsHeaders(env) });

      const response = jsonResponse(data, env);
      response.headers.set('Cache-Control', 'public, max-age=300');
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (e) {
      return jsonResponse({ error: e.message }, env, 500);
    }
  }
};

/* ========== Helpers ========== */

function corsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(data, env, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}

/* ========== Notion API ========== */

async function notionFetch(path, env, body) {
  const res = await fetch(NOTION_API + path, {
    method: body ? 'POST' : 'GET',
    headers: {
      'Authorization': 'Bearer ' + env.NOTION_TOKEN,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error('Notion API error: ' + res.status);
  return res.json();
}

async function queryDatabase(dbId, env, sorts) {
  return notionFetch('/databases/' + dbId + '/query', env, {
    sorts: sorts || [],
    page_size: 100,
  });
}

async function getPageBlocks(pageId, env) {
  return notionFetch('/blocks/' + pageId + '/children?page_size=100', env);
}

/* ========== Rich Text ========== */

function richTextToPlain(arr) {
  if (!arr) return '';
  return arr.map(function(t) { return t.plain_text || ''; }).join('');
}

function richTextToHtml(arr) {
  if (!arr || !arr.length) return '';
  return arr.map(function(t) {
    var s = (t.plain_text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (t.annotations) {
      if (t.annotations.bold) s = '<strong>' + s + '</strong>';
      if (t.annotations.italic) s = '<em>' + s + '</em>';
      if (t.annotations.code) s = '<code>' + s + '</code>';
      if (t.annotations.strikethrough) s = '<del>' + s + '</del>';
    }
    if (t.href) s = '<a href="' + t.href + '" target="_blank" rel="noopener">' + s + '</a>';
    return s;
  }).join('');
}

/* ========== Blocks → HTML ========== */

function blocksToHtml(blocks) {
  var html = '';
  var listTag = null;

  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var type = b.type;

    // 关闭不匹配的列表
    if (listTag && type !== 'bulleted_list_item' && type !== 'numbered_list_item') {
      html += '</' + listTag + '>';
      listTag = null;
    }

    switch (type) {
      case 'paragraph':
        var pText = richTextToHtml(b.paragraph.rich_text);
        if (pText) html += '<p>' + pText + '</p>';
        break;
      case 'heading_1':
        html += '<h2>' + richTextToHtml(b.heading_1.rich_text) + '</h2>';
        break;
      case 'heading_2':
        html += '<h3>' + richTextToHtml(b.heading_2.rich_text) + '</h3>';
        break;
      case 'heading_3':
        html += '<h4>' + richTextToHtml(b.heading_3.rich_text) + '</h4>';
        break;
      case 'bulleted_list_item':
        if (listTag !== 'ul') { if (listTag) html += '</' + listTag + '>'; html += '<ul>'; listTag = 'ul'; }
        html += '<li>' + richTextToHtml(b.bulleted_list_item.rich_text) + '</li>';
        break;
      case 'numbered_list_item':
        if (listTag !== 'ol') { if (listTag) html += '</' + listTag + '>'; html += '<ol>'; listTag = 'ol'; }
        html += '<li>' + richTextToHtml(b.numbered_list_item.rich_text) + '</li>';
        break;
      case 'code':
        html += '<pre><code>' + richTextToHtml(b.code.rich_text) + '</code></pre>';
        break;
      case 'quote':
        html += '<blockquote>' + richTextToHtml(b.quote.rich_text) + '</blockquote>';
        break;
      case 'callout':
        html += '<div style="padding:12px 16px;background:var(--bg-elevated,#222);border-left:3px solid var(--accent,#f7c948);border-radius:4px;margin:12px 0"><p>' + richTextToHtml(b.callout.rich_text) + '</p></div>';
        break;
      case 'divider':
        html += '<hr>';
        break;
      case 'image':
        var src = b.image.type === 'external' ? b.image.external.url : (b.image.file ? b.image.file.url : '');
        if (src) html += '<figure><img src="' + src + '" alt="" loading="lazy"></figure>';
        break;
      case 'toggle':
        html += '<details><summary>' + richTextToHtml(b.toggle.rich_text) + '</summary></details>';
        break;
    }
  }
  if (listTag) html += '</' + listTag + '>';
  return html;
}

/* ========== Property Extractors ========== */

function getProp(page, name) {
  var p = page.properties[name];
  if (!p) return null;
  switch (p.type) {
    case 'title':        return richTextToPlain(p.title);
    case 'rich_text':    return richTextToPlain(p.rich_text);
    case 'select':       return p.select ? p.select.name : '';
    case 'multi_select': return (p.multi_select || []).map(function(s) { return s.name; });
    case 'number':       return p.number;
    case 'date':         return p.date ? p.date.start : '';
    case 'files':        return p.files || [];
    default:             return null;
  }
}

function fileUrl(files) {
  if (!files || !files.length) return '';
  var f = files[0];
  return f.type === 'external' ? f.external.url : (f.file ? f.file.url : '');
}

function fileUrls(files) {
  if (!files) return [];
  return files.map(function(f) {
    return f.type === 'external' ? f.external.url : (f.file ? f.file.url : '');
  }).filter(Boolean);
}

/* ========== Data Fetchers ========== */

async function fetchBlog(env) {
  if (!env.BLOG_DB_ID) throw new Error('BLOG_DB_ID not configured');

  var db = await queryDatabase(env.BLOG_DB_ID, env, [
    { property: 'Date', direction: 'descending' }
  ]);

  var posts = await Promise.all(db.results.map(async function(page, i) {
    var blocks = await getPageBlocks(page.id, env);
    var dateRaw = getProp(page, 'Date') || '';
    var date = dateRaw ? dateRaw.substring(0, 10).replace(/-/g, '.') : '';

    var coverFiles = getProp(page, 'Cover');
    var images = Array.isArray(coverFiles) ? fileUrls(coverFiles) : [];
    if (!images.length && page.cover) {
      var coverUrl = page.cover.type === 'external' ? page.cover.external.url : (page.cover.file ? page.cover.file.url : '');
      if (coverUrl) images.push(coverUrl);
    }

    return {
      id: 'post-' + String(i + 1).padStart(3, '0'),
      date: date,
      title: getProp(page, 'Title') || getProp(page, 'Name') || '',
      summary: getProp(page, 'Summary') || '',
      category: getProp(page, 'Category') || '',
      images: images,
      content: blocksToHtml(blocks.results || []),
    };
  }));

  return posts;
}

async function fetchWorks(env) {
  if (!env.WORKS_DB_ID) throw new Error('WORKS_DB_ID not configured');

  var db = await queryDatabase(env.WORKS_DB_ID, env, [
    { property: 'Year', direction: 'descending' }
  ]);

  var works = await Promise.all(db.results.map(async function(page, i) {
    var blocks = await getPageBlocks(page.id, env);
    var thumbFiles = getProp(page, 'Thumbnail');
    var imgFiles = getProp(page, 'Images');

    return {
      id: 'work-' + String(i + 1).padStart(3, '0'),
      title: getProp(page, 'Title') || getProp(page, 'Name') || '',
      year: String(getProp(page, 'Year') || ''),
      category: getProp(page, 'Category') || '',
      type: 'image',
      thumbnail: Array.isArray(thumbFiles) ? fileUrl(thumbFiles) : '',
      images: Array.isArray(imgFiles) ? fileUrls(imgFiles) : [],
      tags: getProp(page, 'Tags') || [],
      description: blocksToHtml(blocks.results || []),
    };
  }));

  return works;
}
