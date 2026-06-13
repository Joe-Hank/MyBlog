#requires -Version 5.1
<#
.SYNOPSIS
  One-shot migration: convert Notion DB-property and page-body "file"-type images
  into "external" links pointing at the git mirror (GitHub Pages). After this
  runs, Notion no longer references the uploaded files and you can delete them
  in the Notion UI to free storage.

.DESCRIPTION
  Prerequisites:
    1. Run sync-notion-images.ps1 first so src/assets/notion/ has the full mirror.
    2. Commit + push the mirror so GitHub Pages serves it at MirrorBase.
    3. Optionally export Notion workspace as a backup.

  What it does:
    A. For every DB page, PATCH "files" properties so each file-typed item
       becomes external + url = MirrorBase/<file-id>.<ext>.
    B. For every page body (recursively into toggle/list/column/callout),
       DELETE every file-typed image block and REINSERT an external image
       block in the same position. (Notion API does not allow changing the
       type of an existing image block in place.)

  After it finishes, go into Notion workspace settings -> Storage and remove
  the orphaned uploads (or wait for Notion to GC them).

.PARAMETER NotionToken
  Notion integration token (secret_...). Defaults to $env:NOTION_TOKEN.
  The integration must be shared with each target DB.

.PARAMETER DryRun
  Read-only. Strongly recommended for the first run.

.EXAMPLE
  $env:NOTION_TOKEN = "secret_xxxx"
  pwsh scripts/migrate-notion-images.ps1 -DryRun
  pwsh scripts/migrate-notion-images.ps1
  pwsh scripts/migrate-notion-images.ps1 -DbIds '3418e10c17cc80078d13f4778a16cdbd'
#>
[CmdletBinding()]
param(
  [string]$NotionToken = $env:NOTION_TOKEN,
  [string]$MirrorBase  = 'https://joe-hank.github.io/MyBlog/assets/notion',
  [string]$AssetDir    = '',
  [string[]]$DbIds = @(
    '3418e10c17cc80078d13f4778a16cdbd',
    '3418e10c17cc80ca975ee7d9a241dc24',
    '3a4bd9ae988c4ee5b92613f192f40a18',
    'ad16a00224ba4b179a4cb95a2e19a1c4'
  ),
  [switch]$DryRun,
  [string]$NotionVersion = '2022-06-28',
  [int]$RateLimitMs = 200
)

$ErrorActionPreference = 'Stop'
if (-not $NotionToken) { Write-Error 'Set $env:NOTION_TOKEN or pass -NotionToken' }

# Resolve AssetDir robustly (works under -File and & 'path' invocations)
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
  Write-Error ("Mirror dir not found: " + $AssetDir + " (run sync-notion-images.ps1 first)")
}
Write-Host ("AssetDir = " + $AssetDir)

$mirror = $MirrorBase.TrimEnd('/')

# HTTP helper compatible with PS 5.1 (Invoke-RestMethod cannot PATCH there)
function Invoke-Notion {
  param([string]$Method, [string]$Path, [object]$Body)
  Start-Sleep -Milliseconds $RateLimitMs

  $url = 'https://api.notion.com/v1' + $Path
  $req = [System.Net.HttpWebRequest]::Create($url)
  $req.Method = $Method.ToUpper()
  $req.ContentType = 'application/json; charset=utf-8'
  $req.Accept = 'application/json'
  $req.Headers.Add('Authorization', ('Bearer ' + $NotionToken))
  $req.Headers.Add('Notion-Version', $NotionVersion)
  $req.Headers.Add('Accept-Encoding', 'identity')

  if ($Body) {
    $json = $Body | ConvertTo-Json -Depth 30 -Compress
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $req.ContentLength = $bytes.Length
    $rs = $req.GetRequestStream()
    $rs.Write($bytes, 0, $bytes.Length)
    $rs.Close()
  } else {
    $req.ContentLength = 0
  }

  try {
    $resp = $req.GetResponse()
    $sr = New-Object System.IO.StreamReader($resp.GetResponseStream(), [System.Text.Encoding]::UTF8)
    $txt = $sr.ReadToEnd()
    $sr.Close(); $resp.Close()
    if ([string]::IsNullOrWhiteSpace($txt)) { return $null }
    return $txt | ConvertFrom-Json
  } catch [System.Net.WebException] {
    $eresp = $_.Exception.Response
    $err = ''
    if ($eresp) {
      try {
        $sr2 = New-Object System.IO.StreamReader($eresp.GetResponseStream())
        $err = $sr2.ReadToEnd()
        $sr2.Close()
      } catch {}
      throw ("Notion " + $Method + " " + $Path + " failed: " + $eresp.StatusCode.value__ + " " + $err)
    }
    throw
  }
}

function Get-MirrorUrl {
  param([string]$NotionUrl)
  if (-not $NotionUrl) { return $null }
  try {
    $u = [System.Uri]$NotionUrl
    if ($u.Host -notlike '*amazonaws.com*') { return $null }
    $segs = $u.AbsolutePath.Split('/', [System.StringSplitOptions]::RemoveEmptyEntries)
    if ($segs.Length -lt 2) { return $null }
    $fileId = $segs[$segs.Length - 2]
    $filename = [System.Uri]::UnescapeDataString($segs[$segs.Length - 1])
    $ext = [System.IO.Path]::GetExtension($filename).ToLower()
    if (-not $ext) { return $null }
    return ($mirror + '/' + $fileId + $ext)
  } catch { return $null }
}

function Test-MirrorAsset {
  param([string]$Url)
  if (-not $Url) { return $false }
  $name = $Url.Substring($Url.LastIndexOf('/') + 1)
  return Test-Path (Join-Path $AssetDir $name)
}

function Get-DbPages {
  param([string]$DbId)
  $pages = @()
  $body = @{ page_size = 100 }
  while ($true) {
    $res = Invoke-Notion -Method Post -Path ('/databases/' + $DbId + '/query') -Body $body
    $pages += $res.results
    if (-not $res.has_more) { break }
    $body.start_cursor = $res.next_cursor
  }
  return $pages
}

function Get-BlockChildrenAll {
  param([string]$BlockId)
  $all = @()
  $cursor = $null
  while ($true) {
    $path = '/blocks/' + $BlockId + '/children?page_size=100'
    if ($cursor) { $path = $path + '&start_cursor=' + $cursor }
    $res = Invoke-Notion -Method Get -Path $path
    $all += $res.results
    if (-not $res.has_more) { break }
    $cursor = $res.next_cursor
  }
  return $all
}

function Get-PageTitle {
  param([object]$Page)
  foreach ($pname in $Page.properties.PSObject.Properties.Name) {
    $p = $Page.properties.$pname
    if ($p.type -eq 'title' -and $p.title) {
      return ($p.title | ForEach-Object { $_.plain_text }) -join ''
    }
  }
  return '(untitled)'
}

$stats = [ordered]@{
  PropFound = 0; PropMigrated = 0; PropSkipped = 0
  BodyFound = 0; BodyMigrated = 0; BodySkipped = 0
}

function Convert-PageProperties {
  param([object]$Page)
  $newProps = @{}
  $touched = $false
  foreach ($propName in $Page.properties.PSObject.Properties.Name) {
    $prop = $Page.properties.$propName
    if ($prop.type -ne 'files') { continue }
    if (-not $prop.files -or $prop.files.Count -eq 0) { continue }
    $newFiles = @()
    $anyChanged = $false
    foreach ($f in $prop.files) {
      if ($f.type -eq 'external') {
        $newFiles += @{ name = $f.name; type = 'external'; external = @{ url = $f.external.url } }
        continue
      }
      if ($f.type -eq 'file') {
        $stats.PropFound++
        $mUrl = Get-MirrorUrl $f.file.url
        if (-not $mUrl) {
          Write-Warning ('    prop[' + $propName + ']: cannot parse file-id')
          $newFiles += $f; $stats.PropSkipped++; continue
        }
        if (-not (Test-MirrorAsset $mUrl)) {
          Write-Warning ('    prop[' + $propName + ']: mirror missing ' + $mUrl)
          $newFiles += $f; $stats.PropSkipped++; continue
        }
        $newFiles += @{ name = $f.name; type = 'external'; external = @{ url = $mUrl } }
        $anyChanged = $true
        $stats.PropMigrated++
      }
    }
    if ($anyChanged) { $newProps[$propName] = @{ files = $newFiles }; $touched = $true }
  }
  if ($touched) {
    Write-Host '    PATCH page properties' -ForegroundColor Yellow
    if (-not $DryRun) {
      Invoke-Notion -Method Patch -Path ('/pages/' + $Page.id) -Body @{ properties = $newProps } | Out-Null
    }
  }
}

# Iterate children of a parent block (page or container).
# Process image blocks back-to-front so the prev-sibling id used for "after"
# stays valid as we delete/reinsert.
function Convert-BlockChildren {
  param([string]$ParentId)
  $children = Get-BlockChildrenAll -BlockId $ParentId
  for ($i = $children.Count - 1; $i -ge 0; $i--) {
    $b = $children[$i]
    if ($b.type -eq 'image' -and $b.image.type -eq 'file') {
      $stats.BodyFound++
      $mUrl = Get-MirrorUrl $b.image.file.url
      if (-not $mUrl) {
        Write-Warning ('    block[' + $b.id + ']: cannot parse')
        $stats.BodySkipped++
      } elseif (-not (Test-MirrorAsset $mUrl)) {
        Write-Warning ('    block[' + $b.id + ']: mirror missing ' + $mUrl)
        $stats.BodySkipped++
      } else {
        $caption = @()
        if ($b.image.caption) { $caption = $b.image.caption }
        $afterId = if ($i -gt 0) { $children[$i - 1].id } else { $null }
        Write-Host ('    DEL+INS block ' + $b.id + ' -> ' + $mUrl) -ForegroundColor Yellow
        if (-not $DryRun) {
          Invoke-Notion -Method Delete -Path ('/blocks/' + $b.id) | Out-Null
          $newBlock = @{
            object = 'block'
            type = 'image'
            image = @{ type = 'external'; external = @{ url = $mUrl }; caption = $caption }
          }
          $body = @{ children = @($newBlock) }
          if ($afterId) { $body.after = $afterId }
          Invoke-Notion -Method Patch -Path ('/blocks/' + $ParentId + '/children') -Body $body | Out-Null
        }
        $stats.BodyMigrated++
      }
    }
    if ($b.has_children) { Convert-BlockChildren -ParentId $b.id }
  }
}

foreach ($dbId in $DbIds) {
  Write-Host ("`n=== DB " + $dbId + " ===") -ForegroundColor Cyan
  $pages = Get-DbPages -DbId $dbId
  Write-Host ('  pages: ' + $pages.Count)
  foreach ($page in $pages) {
    $title = Get-PageTitle -Page $page
    Write-Host ("`n  [" + $page.id + '] ' + $title)
    Convert-PageProperties -Page $page
    Convert-BlockChildren -ParentId $page.id
  }
}

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host ('  DB property images:  found=' + $stats.PropFound + '  migrated=' + $stats.PropMigrated + '  skipped=' + $stats.PropSkipped)
Write-Host ('  Page body images:    found=' + $stats.BodyFound + '  migrated=' + $stats.BodyMigrated + '  skipped=' + $stats.BodySkipped)
if ($DryRun) { Write-Host '(DryRun: nothing written to Notion)' -ForegroundColor Yellow }
else { Write-Host "`nNext: go to Notion workspace settings -> Storage and remove orphaned file uploads." -ForegroundColor Cyan }
