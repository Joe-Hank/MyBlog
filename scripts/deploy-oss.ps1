#requires -Version 5.1
<#
.SYNOPSIS
  部署 MyBlog 国内(阿里云)版：把 src/ 全量同步到 OSS 桶，并刷新 CDN。

.DESCRIPTION
  纯静态站点 → OSS + CDN。凭据从环境变量读取（永不写进仓库）。
  在仓库根目录建 .env（已 gitignore），或在当前 shell 里 export 以下变量：

    OSS_BUCKET              # 桶名，如 myblog-cn
    OSS_ENDPOINT            # 区域 endpoint，如 oss-cn-shanghai.aliyuncs.com
    OSS_ACCESS_KEY_ID       # RAM 子账号 AK（最小权限：该桶 PutObject/DeleteObject + cdn:RefreshObjectCaches）
    OSS_ACCESS_KEY_SECRET   # RAM 子账号 SK
    CDN_DOMAIN             # 备案加速域名，如 joecloud.asia

  依赖：ossutil（OSS 官方 CLI）、aliyun（阿里云 CLI，用于 CDN 刷新，可选）。

.EXAMPLE
  pwsh scripts/deploy-oss.ps1
  pwsh scripts/deploy-oss.ps1 -SkipCdn      # 只传 OSS，不刷 CDN
#>
[CmdletBinding()]
param(
  [switch]$SkipCdn
)
$ErrorActionPreference = 'Stop'

# ── 载入 .env（若存在）──────────────────────────────────────────────
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $repo '.env'
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$' -and $_ -notmatch '^\s*#') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2].Trim('"').Trim("'"))
    }
  }
}

# ── 校验必需变量（不打印值）────────────────────────────────────────
$required = 'OSS_BUCKET','OSS_ENDPOINT','OSS_ACCESS_KEY_ID','OSS_ACCESS_KEY_SECRET','CDN_DOMAIN'
$missing = $required | Where-Object { -not [Environment]::GetEnvironmentVariable($_) }
if ($missing) { throw "缺少环境变量: $($missing -join ', ')（放进 .env 或 export）" }

$bucket   = $env:OSS_BUCKET
$endpoint = $env:OSS_ENDPOINT
$cdn      = $env:CDN_DOMAIN
$src      = Join-Path $repo 'src'
# 优先用仓库内 tools/ossutil.exe（gitignore），否则用 PATH 里的 ossutil
$localOssutil = Join-Path $repo 'tools\ossutil.exe'
$ossutil = if (Test-Path $localOssutil) { $localOssutil }
           elseif (Get-Command ossutil -ErrorAction SilentlyContinue) { 'ossutil' }
           else { throw 'ossutil 未安装：把 ossutil.exe 放进 tools/ 或加入 PATH（https://help.aliyun.com/zh/oss/developer-reference/ossutil）' }

$auth = @('-i', $env:OSS_ACCESS_KEY_ID, '-k', $env:OSS_ACCESS_KEY_SECRET, '-e', $endpoint)

# 一次性桶配置（首次已做，重复执行无害）：公共读 + 静态网站托管
Write-Host "→ 确保公共读 ACL" -ForegroundColor Cyan
& $ossutil set-acl "oss://$bucket/" public-read -b -f @auth

Write-Host "→ 同步 src/ 全量到桶" -ForegroundColor Cyan
& $ossutil cp -r -f --update "$src/" "oss://$bucket/" @auth

Write-Host "→ assets/ 设长缓存（1 年）" -ForegroundColor Cyan
& $ossutil set-meta "oss://$bucket/assets/" "Cache-Control:public, max-age=31536000" -r -f @auth

$aliyunExe = if (Test-Path (Join-Path $repo 'tools\aliyun.exe')) { Join-Path $repo 'tools\aliyun.exe' }
             elseif (Get-Command aliyun -ErrorAction SilentlyContinue) { 'aliyun' } else { $null }
if ($SkipCdn) {
  Write-Host "[skip] 未刷新 CDN（-SkipCdn）。" -ForegroundColor DarkGray
} elseif ($aliyunExe) {
  Write-Host "→ 刷新 CDN 目录缓存 https://$cdn/" -ForegroundColor Cyan
  & $aliyunExe cdn RefreshObjectCaches --ObjectType Directory --ObjectPath "https://$cdn/" `
      --mode AK --access-key-id $env:OSS_ACCESS_KEY_ID --access-key-secret $env:OSS_ACCESS_KEY_SECRET --region cn-hangzhou
} else {
  Write-Host "[warn] 未找到 aliyun CLI（tools/aliyun.exe 或 PATH），跳过 CDN 刷新。控制台手动刷 https://$cdn/" -ForegroundColor Yellow
}

Write-Host "✔ 部署完成：https://$cdn/" -ForegroundColor Green
