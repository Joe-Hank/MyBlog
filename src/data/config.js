// MyBlog 数据源配置
// 国内(阿里云)版：Notion 内容已冻结为静态快照（data/*.json），
// notionProxy 留空 → 前端直接读本地 JSON，零 Cloudflare Worker / Notion 依赖。
// 如需恢复实时 Notion，填回 Worker URL 即可。
var SITE_CONFIG = {
  notionProxy: ''
};
