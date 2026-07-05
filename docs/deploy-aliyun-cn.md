# 国内(阿里云)部署 — cn-aliyun 分支

国内版是**纯静态**站点：`Notion 已冻结成 src/data/*.json`，前端零 Cloudflare Worker / Notion 依赖，图片/字体/marked 全部自托管。海外版（`main` → GitHub Pages）不受影响，双活并存。

## 与 main 的差异（都在本分支）
- `src/data/config.js`：`notionProxy: ''`（走本地冻结 JSON）
- `src/data/*.json`：从 worker 快照并把图片 URL 相对化（`assets/notion/...`）
- 字体：自托管 `src/assets/fonts/*.woff2`（去 Google Fonts）
- marked：自托管 `src/assets/vendor/marked.min.js`（去 jsdelivr）
- 4 页页脚：ICP 备案号 `津ICP备2025041910号-2` → https://beian.miit.gov.cn

## 一次性准备
1. **OSS 桶**（就近 region）：开静态网站托管，默认首页 `index.html`；桶 ACL = **public-read 只读**（禁公共写/list）。
2. **CDN**：加速域名 `joecloud.asia` → 源站该 OSS 桶；开 **HTTPS**（传/申证书）；备案域名放行。
3. **RAM 子账号**：最小权限（目标桶 `PutObject/DeleteObject` + `cdn:RefreshObjectCaches`），拿 AK/SK。
4. 装 `ossutil`（必需）、`aliyun` CLI（刷 CDN，可选）。
5. 仓库根建 `.env`（已 gitignore），按 `.env.example` 填 5 个变量。

## 每次部署
```powershell
pwsh scripts/deploy-oss.ps1
```
脚本：assets/ 长缓存（1 年 immutable）、HTML+data 短缓存（5 分钟）同步到桶，再刷 CDN。

## 内容更新（Notion 已冻结）
以后直接改 `src/data/*.json` 或 `src/assets/` 里的图，再跑一次 `deploy-oss.ps1`。
（若想恢复 Notion 实时：把 `config.js` 的 `notionProxy` 填回 Worker URL — 但 Worker 在国内会被墙，不推荐。）

## 🔴 安全红线
- **NOTION_TOKEN** 绝不进国内基础设施 / 前端 / 仓库；只留海外 Worker。
- **阿里云 AK/SK** 只放本地 `.env`（gitignore），永不提交、永不外发；用 RAM 子账号最小权限。
- OSS 桶只读、可加 Referer 防盗链（白名单 `joecloud.asia`）。
