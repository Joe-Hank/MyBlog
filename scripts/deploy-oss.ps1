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
if (-not (Get-Command ossutil -ErrorAction SilentlyContinue)) { throw 'ossutil 未安装 / 不在 PATH。见 https://help.aliyun.com/zh/oss/developer-reference/ossutil' }

$auth = @('-i', $env:OSS_ACCESS_KEY_ID, '-k', $env:OSS_ACCESS_KEY_SECRET, '-e', $endpoint)

Write-Host "→ 同步 assets/（长缓存，1 年 immutable）" -ForegroundColor Cyan
& ossutil cp -r -f --update "$src/assets/" "oss://$bucket/assets/" @auth --meta "Cache-Control:public, max-age=31536000, immutable"

Write-Host "→ 同步 HTML / data / 其它（短缓存，5 分钟，便于内容更新）" -ForegroundColor Cyan
& ossutil cp -r -f --update "$src/" "oss://$bucket/" @auth --exclude "assets/*" --meta "Cache-Control:public, max-age=300"

if ($SkipCdn) {
  Write-Host "[skip] 未刷新 CDN（-SkipCdn）。" -ForegroundColor DarkGray
} elseif (Get-Command aliyun -ErrorAction SilentlyContinue) {
  Write-Host "→ 刷新 CDN 目录缓存 https://$cdn/" -ForegroundColor Cyan
  & aliyun cdn RefreshObjectCaches --ObjectPath "https://$cdn/" --ObjectType Directory `
      --AccessKeyId $env:OSS_ACCESS_KEY_ID --AccessKeySecret $env:OSS_ACCESS_KEY_SECRET
} else {
  Write-Host "[warn] 未装 aliyun CLI，跳过 CDN 刷新。可在控制台手动刷新 https://$cdn/" -ForegroundColor Yellow
}

Write-Host "✔ 部署完成：https://$cdn/" -ForegroundColor Green
