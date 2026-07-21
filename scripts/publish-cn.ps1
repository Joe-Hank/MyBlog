#requires -Version 5.1
<#
.SYNOPSIS
  一键发布国内站：从 Notion 拉内容 → 生成静态 → 传 OSS + 刷 CDN。
  在 Notion 里改完内容，跑这一条即可。全程在本机，不碰 GitHub。

.EXAMPLE
  pwsh -ExecutionPolicy Bypass -File scripts\publish-cn.ps1
  pwsh -ExecutionPolicy Bypass -File scripts\publish-cn.ps1 -BuildOnly   # 只生成不发布（首次验证用）
#>
[CmdletBinding()]
param([switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = Split-Path $here -Parent

# node 在不在
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "没找到 node。请先装 Node.js（https://nodejs.org），或把 node 加进 PATH。"
}

Write-Host "① 从 Notion 拉取并生成静态内容 (build-cn.mjs)..." -ForegroundColor Cyan
node (Join-Path $here 'build-cn.mjs')
if ($LASTEXITCODE -ne 0) { throw "构建失败（上面有报错）。" }

if ($BuildOnly) {
  Write-Host "`n✔ 仅生成，未发布。已更新本地 src\data\*.json + src\assets\notion\。" -ForegroundColor Green
  Write-Host "  确认无误后，去掉 -BuildOnly 再跑一次即可发布。" -ForegroundColor DarkGray
  return
}

Write-Host "② 上传 OSS + 刷新 CDN (deploy-oss.ps1)..." -ForegroundColor Cyan
& (Join-Path $here 'deploy-oss.ps1')

Write-Host "`n✔ 发布完成：https://joecloud.asia/" -ForegroundColor Green
Write-Host "  提示：内容的真源是 Notion。日常改 Notion 后跑这条脚本即可；" -ForegroundColor DarkGray
Write-Host "        ASC 等 CN-only 条目在 src\data\works.local.json 里维护。" -ForegroundColor DarkGray
