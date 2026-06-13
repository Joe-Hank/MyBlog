# 博客图片工作流

git 仓库的 `src/assets/notion/` 是图片唯一源头。Notion 里所有图都用 **External URL** block 指向 GitHub Pages 镜像，不占 Notion 配额。

## 日常：写新文章

```powershell
# 把图扔进 git，输出 URL 自动复制到剪贴板
pwsh scripts/add-blog-image.ps1 .\screenshot.png

# 多张：
pwsh scripts/add-blog-image.ps1 .\a.jpg .\b.png

# 顺手 push：
pwsh scripts/add-blog-image.ps1 .\a.png -Push
```

在 Notion 文章里：**+** → **Image** → **Embed link** → Ctrl-V 粘贴。

写完文章统一推一次：`git add src/assets/notion && git commit -m "chore: ..." && git push`

> ⚠️ 不要在 Notion 直接 **Upload** 图片（那会吃配额）。
> ⚠️ 不要重命名 `src/assets/notion/` 里的文件（URL 写死了，改名会 404）。

## 旧文章一次性迁移（首次跑一次）

把 Notion 里以前 upload 的图都换成 external，释放配额。

```powershell
# 1. 同步现存 Notion 图到 git 镜像（已做过可跳）
pwsh scripts/sync-notion-images.ps1
git add src/assets/notion && git commit && git push

# 2. 准备 Notion token（跟 worker 用同一个，Cloudflare Worker secrets 里能查）
$env:NOTION_TOKEN = "secret_xxxxxx"

# 3. dry-run 预览
pwsh scripts/migrate-notion-images.ps1 -DryRun

# 4. 真改
pwsh scripts/migrate-notion-images.ps1
```

跑完到 Notion 工作区设置看 Storage，旧 file 已经孤立，可删（或等 Notion 自动 GC）。

## 排错

| 现象 | 处理 |
|---|---|
| Notion 里图 broken | GitHub Pages 还没部署到，等 1-2 分钟 |
| 迁移脚本 `skipped` 很多 | 先跑 `sync-notion-images.ps1` 补齐镜像 |
| 迁移脚本 `unauthorized` | `NOTION_TOKEN` 没设或没共享给 DB |
| 迁移脚本 `409 conflict` | 加 `-RateLimitMs 500` 重跑 |

## 配置

镜像 base 在 [worker/wrangler.toml](../worker/wrangler.toml) 的 `MIRROR_BASE`，目前是 `https://joe-hank.github.io/MyBlog/assets/notion`。
