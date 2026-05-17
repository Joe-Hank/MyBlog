// MyBlog 数据源配置
// 部署 Notion 代理后，将 Cloudflare Worker URL 填入 notionProxy
// 例如: notionProxy: 'https://myblog-notion-proxy.your-subdomain.workers.dev'
// 留空则使用本地 JSON 文件（data/blog.json, data/works.json）
var SITE_CONFIG = {
  notionProxy: ''
};
