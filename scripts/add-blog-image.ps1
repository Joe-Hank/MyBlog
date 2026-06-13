#requires -Version 5.1
<#
.SYNOPSIS
  Copy local image(s) into the git-tracked mirror dir and print the
  GitHub Pages URL each will be served at. Workflow (Plan B):
    1. Prepare image(s) locally
    2. Run this script
    3. URL is copied to clipboard
    4. Paste into a Notion Image block (choose "Embed link", not Upload)
    5. Commit + push src/assets/notion after writing

.EXAMPLE
  pwsh scripts/add-blog-image.ps1 .\screenshot.png
  pwsh scripts/add-blog-image.ps1 D:\photos\a.jpg D:\photos\b.png
  pwsh scripts/add-blog-image.ps1 .\a.png -Push
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory=$true, Position=0, ValueFromRemainingArguments=$true)]
  [string[]]$Path,
  [string]$MirrorBase = 'https://joe-hank.github.io/MyBlog/assets/notion',
  [string]$AssetDir   = '',
  [switch]$Push
)

$ErrorActionPreference = 'Stop'
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
  Write-Host ("Created " + $AssetDir)
}

$urls = @()
foreach ($p in $Path) {
  if (-not (Test-Path $p)) { Write-Warning ("skip (not found): " + $p); continue }
  $src = (Resolve-Path -LiteralPath $p).Path
  $ext = [System.IO.Path]::GetExtension($src).ToLower()
  if (-not $ext) { Write-Warning ("skip (no extension): " + $src); continue }

  $fileId = [guid]::NewGuid().ToString()
  $destName = $fileId + $ext
  $dest = Join-Path $AssetDir $destName
  Copy-Item -LiteralPath $src -Destination $dest

  $url = $MirrorBase.TrimEnd('/') + '/' + $destName
  $leaf = Split-Path $src -Leaf
  Write-Host ("[ok] " + $leaf.PadRight(40) + ' -> ' + $url) -ForegroundColor Green
  $urls += $url
}

if ($urls.Count -gt 0) {
  ($urls -join "`r`n") | Set-Clipboard
  Write-Host ''
  Write-Host ("" + $urls.Count + " URL(s) copied to clipboard.") -ForegroundColor Cyan
  Write-Host 'Next: paste into Notion Image block (Embed link).' -ForegroundColor Cyan
} else {
  Write-Warning 'No image processed.'
  exit 1
}

if ($Push) {
  $repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
  Push-Location $repo
  try {
    git add src/assets/notion
    $msg = "chore(assets): add " + $urls.Count + " blog image(s)"
    git commit -m $msg
    git push
    Write-Host ('[push] ' + $msg) -ForegroundColor Green
  } finally { Pop-Location }
} else {
  Write-Host ''
  Write-Host 'Reminder: git add src/assets/notion ; git commit ; git push' -ForegroundColor DarkGray
}
