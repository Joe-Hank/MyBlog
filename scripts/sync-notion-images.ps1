#requires -Version 5.1
<#
.SYNOPSIS
  Mirror Notion-hosted (S3 pre-signed) images into src/assets/notion/ so the
  worker can serve stable GitHub Pages URLs instead of 1-hour-expiring S3 URLs.

.DESCRIPTION
  1. Calls the deployed worker endpoints (/blog, /works, /banner, /timeline) with
     ?raw=1 so they return the original Notion S3 URLs (bypassing the URL rewrite).
  2. Walks every JSON response and extracts all amazonaws.com URLs.
  3. For each unique <file-id>.<ext>, downloads to src/assets/notion/<file-id>.<ext>
     if not already present (idempotent).
  4. Run again whenever you upload new images to Notion, then commit + push.

.EXAMPLE
  pwsh scripts/sync-notion-images.ps1
  pwsh scripts/sync-notion-images.ps1 -Force        # re-download even if exists
  pwsh scripts/sync-notion-images.ps1 -WorkerBase https://my.worker.dev
#>
[CmdletBinding()]
param(
  [string]$WorkerBase = 'https://myblog-notion-proxy.wenhuawasi.workers.dev',
  [string]$AssetDir   = '',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$endpoints = @('/blog', '/works', '/banner', '/timeline')

# 自动解析 AssetDir（兼容 -File / & ScriptBlock 两种调用方式）
if (-not $AssetDir) {
  $scriptDir = $PSScriptRoot
  if (-not $scriptDir -and $MyInvocation.MyCommand.Path) {
    $scriptDir = Split-Path $MyInvocation.MyCommand.Path -Parent
  }
  if (-not $scriptDir) { $scriptDir = (Get-Location).Path + '\scripts' }
  $AssetDir = Join-Path $scriptDir '..\src\assets\notion'
}
$AssetDir = [System.IO.Path]::GetFullPath($AssetDir)
if (-not (Test-Path $AssetDir)) {
  New-Item -ItemType Directory -Path $AssetDir -Force | Out-Null
  Write-Host "Created $AssetDir"
}

# Collect (fileId, ext) -> url across all endpoints
$wanted = @{}

foreach ($ep in $endpoints) {
  $u = "$WorkerBase$ep`?raw=1"
  Write-Host "[fetch] $u"
  $wc = New-Object System.Net.WebClient
  $wc.Encoding = [System.Text.Encoding]::UTF8
  $raw = $wc.DownloadString($u)

  # Decode \uXXXX JSON escapes so & doesn't appear as & inside URLs
  $decoded = [regex]::Replace($raw, '\\u([0-9a-fA-F]{4})', {
    param($m) [char][int]('0x' + $m.Groups[1].Value)
  })

  $matches = [regex]::Matches($decoded, 'https://prod-files-secure\.s3[^\s"\\]+')
  foreach ($m in $matches) {
    $url = $m.Value
    try {
      $uri = [System.Uri]$url
      $segs = $uri.AbsolutePath.Split('/', [System.StringSplitOptions]::RemoveEmptyEntries)
      if ($segs.Length -lt 2) { continue }
      $fileId   = $segs[$segs.Length - 2]
      $filename = [System.Uri]::UnescapeDataString($segs[$segs.Length - 1])
      $ext      = [System.IO.Path]::GetExtension($filename).ToLower()
      if (-not $ext) { continue }
      $key = "$fileId$ext"
      if (-not $wanted.ContainsKey($key)) { $wanted[$key] = $url }
    } catch {
      Write-Warning "skip unparseable URL: $url"
    }
  }
  Write-Host "  matched $($matches.Count) S3 URLs"
}

Write-Host "`nUnique mirror targets: $($wanted.Count)"

# Download
$downloaded = 0; $skipped = 0; $failed = 0
foreach ($pair in $wanted.GetEnumerator()) {
  $name = $pair.Key
  $dest = Join-Path $AssetDir $name
  if ((Test-Path $dest) -and -not $Force) {
    $skipped++
    continue
  }
  try {
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($pair.Value, $dest)
    $size = (Get-Item $dest).Length
    Write-Host ("  [+] {0}  ({1:N1} KB)" -f $name, ($size / 1KB))
    $downloaded++
  } catch {
    Write-Warning "  [x] $name failed: $($_.Exception.Message)"
    $failed++
  }
}

Write-Host "`nSummary: $downloaded downloaded, $skipped already present, $failed failed"
Write-Host "Mirror dir: $AssetDir"
