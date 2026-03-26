# ==========================================
# ProjectBook-Planner - Build Script
# Usage:
#   Engine_InteractiveParcelMap.cmd          -> compile only
#   Engine_InteractiveParcelMap.cmd debug    -> compile + open in browser
#   Engine_InteractiveParcelMap.cmd serve    -> compile + local server (enables direct Save Config)
# ==========================================

param(
    [string]$Mode = "reload",
    [int]$Port = 3030
)

Set-StrictMode -Version Latest

$base         = Split-Path $MyInvocation.MyCommand.Path -Resolve
$src          = Join-Path $base "src"
$shell        = Join-Path $src  "index.html"
$checklistSrc = Join-Path $src  "checklist.html"
$outputDir    = Join-Path $base "Output"
$outputMap    = Join-Path $outputDir "InteractiveMap.html"
$outputChk    = Join-Path $outputDir "PreApp_Checklist.html"
$docsDir      = Join-Path $base "docs"
$publicUrl    = "https://blueberry0120x.github.io/ParcelDashboard/"
$cssFile      = Join-Path $src  "css\style.css"
$siteDataFile = Join-Path $base "data\site-data.json"


$engines = @(
    "js/engine-config.js",
    "js/engine-ui.js",
    "js/engine-map.js",
    "js/engine-elevation.js",
    "js/engine-setback.js",
    "js/engine-export.js",
    "js/engine-resize.js",
    "js/bootstrap.js"
)

# ── Get-SiteFile: find the .json path for a given siteId ──────────────────
function Get-SiteFile {
    param([string]$SiteId)
    $sitesDir = Join-Path $base "data\sites"
    if (-not (Test-Path $sitesDir)) { return $null }
    $files = Get-ChildItem $sitesDir -Filter "*.json" -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($null -ne $raw.site -and "$($raw.site.siteId)" -eq $SiteId) {
                return $f.FullName
            }
        } catch {}
    }
    return $null
}

# ── site-data.json injection helper ───────────────────────────────────────
# Reads active site file from data/sites/ (via pointer in site-data.json)
# Merges .site (static) + .saved (session) into window.__SITE_DEFAULTS__
# Returns the <script> tag string, or "" if nothing to inject
function Get-InjectScript {
    $activeId = Get-ActiveSiteId
    if (-not $activeId) { return "" }
    $siteFile = Get-SiteFile -SiteId $activeId
    if (-not $siteFile) { return "" }
    try {
        $sd = Get-Content $siteFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $merged = [ordered]@{}
        $projectProp = $sd.PSObject.Properties['project']
        if ($null -ne $projectProp -and "$($projectProp.Value)" -ne "") {
            $merged["project"] = $projectProp.Value
        }
        $siteProp = $sd.PSObject.Properties['site']
        if ($null -ne $siteProp -and $null -ne $siteProp.Value) {
            $siteProp.Value.PSObject.Properties | ForEach-Object { $merged[$_.Name] = $_.Value }
        }
        $savedProp = $sd.PSObject.Properties['saved']
        if ($null -ne $savedProp -and $null -ne $savedProp.Value) {
            $savedProp.Value.PSObject.Properties | ForEach-Object { $merged[$_.Name] = $_.Value }
        }
        # Inject the actual filename so JS can use it for downloads
        $merged["siteFileName"] = [System.IO.Path]::GetFileName($siteFile)
        if ($merged.Count -gt 0) {
            $json = $merged | ConvertTo-Json -Compress -Depth 10
            return "<script>window.__SITE_DEFAULTS__ = $json;</script>"
        }
    } catch {}
    return ""
}

# ── site list injection helper ─────────────────────────────────────────────
# Reads all JSON files from data/sites/ and builds window.__SITE_LIST__
# Each entry: { siteId, address, apn, file }
function Get-SiteListScript {
    $sitesDir = Join-Path $base "data\sites"
    if (-not (Test-Path $sitesDir)) { return "" }
    $files = Get-ChildItem $sitesDir -Filter "*.json" -ErrorAction SilentlyContinue
    if ($files.Count -eq 0) { return "" }
    $list = @()
    foreach ($f in $files) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            $s = $raw.site
            if ($null -ne $s) {
                $entry = [ordered]@{
                    siteId  = $s.siteId
                    address = $s.address
                    apn     = $s.apn
                    file    = $f.Name
                }
                $list += $entry
            }
        } catch {}
    }
    if ($list.Count -gt 0) {
        $json = $list | ConvertTo-Json -Compress -Depth 5
        return "<script>window.__SITE_LIST__ = $json;</script>"
    }
    return ""
}

function Resolve-SiteObject {
    param([string]$PreferredSiteId)
    $sitesDir = Join-Path $base "data\sites"
    if (-not (Test-Path $sitesDir)) { return $null }
    $fallback = $null
    $files = Get-ChildItem $sitesDir -Filter "*.json" -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($null -eq $raw.site) { continue }
            if ($null -eq $fallback) { $fallback = $raw.site }
            if ($PreferredSiteId -and "$($raw.site.siteId)" -eq $PreferredSiteId) {
                return $raw.site
            }
        } catch {}
    }
    return $fallback
}

function Get-ActiveSiteId {
    if (-not (Test-Path $siteDataFile)) { return $null }
    try {
        $sd = Get-Content $siteDataFile -Raw -Encoding UTF8 | ConvertFrom-Json
        # New pointer format: { "activeSiteId": "CA-EUCLID" }
        $idProp = $sd.PSObject.Properties['activeSiteId']
        if ($null -ne $idProp -and "$($idProp.Value)" -ne "") { return "$($idProp.Value)" }
        # Migration fallback: top-level siteId (client payload format)
        $topIdProp = $sd.PSObject.Properties['siteId']
        if ($null -ne $topIdProp -and "$($topIdProp.Value)" -ne "") { return "$($topIdProp.Value)" }
        # Migration fallback: old full-copy format had .site.siteId
        $siteProp = $sd.PSObject.Properties['site']
        if ($null -ne $siteProp -and $null -ne $siteProp.Value) {
            $siteIdProp = $siteProp.Value.PSObject.Properties['siteId']
            if ($null -ne $siteIdProp -and "$($siteIdProp.Value)" -ne "") { return "$($siteIdProp.Value)" }
        }
    } catch {}
    return $null
}

function Get-SitesApiJson {
    $sitesDir = Join-Path $base "data\sites"
    $activeId = Get-ActiveSiteId
    $list = @()
    if (Test-Path $sitesDir) {
        $files = Get-ChildItem $sitesDir -Filter "*.json" -ErrorAction SilentlyContinue
        foreach ($f in $files) {
            try {
                $raw = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
                if ($null -eq $raw.site -or "$($raw.site.siteId)" -eq "") { continue }
                $list += [ordered]@{
                    id      = "$($raw.site.siteId)"
                    address = "$($raw.site.address)"
                    apn     = "$($raw.site.apn)"
                    active  = ($activeId -eq "$($raw.site.siteId)")
                }
            } catch {}
        }
    }
    return ($list | ConvertTo-Json -Compress -Depth 5)
}

function Set-ActiveSite {
    param([string]$SiteId)
    if ([string]::IsNullOrWhiteSpace($SiteId)) { return $false }
    $siteFile = Get-SiteFile -SiteId $SiteId
    if (-not $siteFile) { return $false }
    # Update pointer only -- no file copy
    $pointer = "{`"activeSiteId`":`"$SiteId`"}"
    [System.IO.File]::WriteAllText($siteDataFile, $pointer, [System.Text.UTF8Encoding]::new($false))
    Build-Html | Out-Null
    Build-Checklist | Out-Null
    return $true
}

# ── Suite nav — now inline in source HTML (suite-tabs in header / React) ───

# ── Build: InteractiveMap ───────────────────────────────────────────────────
function Build-Html {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  [1/2] InteractiveMap                    " -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Path $shell)) { Write-Host "  [ERROR] index.html not found" -ForegroundColor Red; return $false }
    $html = Get-Content $shell -Raw -Encoding UTF8

    # Inline CSS
    if (-not (Test-Path $cssFile)) { Write-Host "  [ERROR] style.css not found" -ForegroundColor Red; return $false }
    $cssContent = Get-Content $cssFile -Raw -Encoding UTF8
    $html = $html.Replace('<link rel="stylesheet" href="css/style.css" />', "<style>`n$cssContent`n</style>")
    Write-Host "  [+] Inlined: css/style.css" -ForegroundColor Green

    # Inline engines
    foreach ($eng in $engines) {
        $engPath = Join-Path $src ($eng -replace '/', '\')
        if (-not (Test-Path $engPath)) { Write-Host "  [WARN] Missing: $eng" -ForegroundColor Yellow; continue }
        $jsContent = Get-Content $engPath -Raw -Encoding UTF8
        $html = $html.Replace("<script src=`"$eng`"></script>", "<script>`n$jsContent`n</script>")
        Write-Host "  [+] Inlined: $eng" -ForegroundColor Green
    }

    $html = $html.Replace("Development Shell -->", "Compiled Build -->")
    $html = $html.Replace("<!-- Open with Live Server (VS Code Go Live). Run build.cmd to compile to InteractiveMap.html -->", "")

    # Inject site-data.json (site identity + session state merged)
    $inject = Get-InjectScript
    if ($inject) {
        $html = $html.Replace('</head>', "$inject`n</head>")
        Write-Host "  [+] Injected settings from site-data.json" -ForegroundColor Green
    } else {
        Write-Host "  [i] No site-data.json settings found (using defaults)" -ForegroundColor DarkGray
    }

    # Inject site list from data/sites/
    $siteList = Get-SiteListScript
    if ($siteList) {
        $html = $html.Replace('</head>', "$siteList`n</head>")
        Write-Host "  [+] Injected site list from data/sites/" -ForegroundColor Green
    }

    # Suite nav is now inline in source HTML (suite-tabs in header)

    # Ensure Output dir exists and write
    if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }
    [System.IO.File]::WriteAllText($outputMap, $html, [System.Text.UTF8Encoding]::new($false))

    Write-Host ""
    Write-Host "  [DONE] Output\InteractiveMap.html" -ForegroundColor Green
    Write-Host ""
    return $true
}

# ── Build: PreApp Checklist (desktop) ──────────────────────────────────────
function Build-Checklist {
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  [2/2] PreApp_Checklist                  " -ForegroundColor Cyan
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host ""

    if (-not (Test-Path $checklistSrc)) { Write-Host "  [WARN] src\checklist.html not found - skipping" -ForegroundColor Yellow; return $true }
    $html = Get-Content $checklistSrc -Raw -Encoding UTF8

    # Inject site-data.json (same merged payload as InteractiveMap)
    $inject = Get-InjectScript
    if ($inject) {
        $html = $html.Replace('</head>', "$inject`n</head>")
        Write-Host "  [+] Injected settings from site-data.json" -ForegroundColor Green
    }

    # Inject site list from data/sites/
    $siteList = Get-SiteListScript
    if ($siteList) {
        $html = $html.Replace('</head>', "$siteList`n</head>")
        Write-Host "  [+] Injected site list from data/sites/" -ForegroundColor Green
    }

    # Suite nav is now inline in source HTML (suite-tabs in React header)

    if (-not (Test-Path $outputDir)) { New-Item -ItemType Directory -Path $outputDir -Force | Out-Null }
    [System.IO.File]::WriteAllText($outputChk, $html, [System.Text.UTF8Encoding]::new($false))

    Write-Host ""
    Write-Host "  [DONE] Output\PreApp_Checklist.html" -ForegroundColor Green
    Write-Host ""
    return $true
}

# ── Initial build ──────────────────────────────────────────────────────────
$ok = Build-Html
if (-not $ok) { exit 1 }
Build-Checklist | Out-Null

# ── Sync Output -> docs (twin publish) ─────────────────────────────────────
if (-not (Test-Path $docsDir)) { New-Item -ItemType Directory -Path $docsDir -Force | Out-Null }
Copy-Item $outputMap (Join-Path $docsDir "InteractiveMap.html") -Force
Copy-Item $outputChk (Join-Path $docsDir "PreApp_Checklist.html") -Force
Write-Host "  [DOCS] Synced Output -> docs/ (push to main triggers public mirror)" -ForegroundColor DarkCyan
Write-Host ""

# ── Modes ──────────────────────────────────────────────────────────────────
if ($Mode -eq "debug") {
    Write-Host "  [DEBUG] Opening in browser..." -ForegroundColor Cyan
    Start-Process $outputMap
}

if ($Mode -eq "serve") {
    $port = $Port
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    try { $listener.Start() } catch {
        Write-Host "  [ERROR] Cannot start server on port $port - is it already running?" -ForegroundColor Red
        exit 1
    }

    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  [LOCAL]  http://localhost:$port           Map" -ForegroundColor Cyan
    Write-Host "           http://localhost:$port/checklist  Checklist" -ForegroundColor Cyan
    Write-Host "  [PUBLIC] $publicUrl" -ForegroundColor DarkCyan
    Write-Host "           ${publicUrl}PreApp_Checklist.html" -ForegroundColor DarkCyan
    Write-Host "  Save Config writes directly to site-data.json" -ForegroundColor Green
    Write-Host "  Press Ctrl+C to stop" -ForegroundColor DarkGray
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host ""

    Start-Process "http://localhost:$port/"

    try {
        while ($listener.IsListening) {
            $context = $null
            try { $context = $listener.GetContext() } catch { break }
            $req = $context.Request
            $res = $context.Response

            # CORS — allow browser to POST from localhost only
            $origin = $context.Request.Headers["Origin"]
            if ($origin -match '^https?://(localhost|127\.0\.0\.1)(:\d+)?$') {
                $res.Headers.Add("Access-Control-Allow-Origin", $origin)
            } else {
                $res.Headers.Add("Access-Control-Allow-Origin", "http://localhost:$port")
            }
            $res.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $res.Headers.Add("Access-Control-Allow-Headers", "Content-Type")

            try {
                if ($req.HttpMethod -eq "OPTIONS") {
                    $res.StatusCode = 204

                } elseif ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -eq "/backup-checklist") {
                    $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                    $body   = $reader.ReadToEnd()
                    $backupDir = Join-Path $base "config\backup"
                    if (-not (Test-Path $backupDir)) { New-Item -ItemType Directory -Path $backupDir -Force | Out-Null }
                    $stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
                    $backupFile = Join-Path $backupDir "preapp-checklist-$stamp.json"
                    [System.IO.File]::WriteAllText($backupFile, $body, [System.Text.UTF8Encoding]::new($false))
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                    $res.ContentType = "application/json"
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)

                } elseif ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -eq "/save") {
                    $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                    $body   = $reader.ReadToEnd()
                    # Write to the active site file only -- site-data.json stays as pointer
                    try {
                        $incoming = ConvertFrom-Json -InputObject $body
                        $siteIdProp = $incoming.PSObject.Properties['siteId']
                        $targetSiteId = if ($null -ne $siteIdProp -and "$($siteIdProp.Value)" -ne "") { "$($siteIdProp.Value)" } else { Get-ActiveSiteId }
                        if ($targetSiteId) {
                            $siteFile = Get-SiteFile -SiteId $targetSiteId
                            if ($siteFile) {
                                $existing = Get-Content $siteFile -Raw -Encoding UTF8 | ConvertFrom-Json
                                $resolvedSite = $existing.PSObject.Properties['site']
                                $existingSite = if ($null -ne $resolvedSite) { $resolvedSite.Value } else { Resolve-SiteObject -PreferredSiteId $targetSiteId }
                                $projectProp = $incoming.PSObject.Properties['project']
                                $savedProp = $incoming.PSObject.Properties['saved']
                                $checklistProp = $incoming.PSObject.Properties['checklist']
                                $projectName = if ($null -ne $projectProp -and "$($projectProp.Value)" -ne "") { "$($projectProp.Value)" } else { "ProjectBook-Planner" }
                                $merged = [PSCustomObject]@{
                                    project   = $projectName
                                    site      = $existingSite
                                    saved     = if ($null -ne $savedProp) { $savedProp.Value } else { $null }
                                    checklist = if ($null -ne $checklistProp) { $checklistProp.Value } else { $null }
                                }
                                $writeBody = $merged | ConvertTo-Json -Depth 10
                                [System.IO.File]::WriteAllText($siteFile, $writeBody, [System.Text.UTF8Encoding]::new($false))
                            }
                        }
                    } catch {}
                    Write-Host "  [SAVE] site saved - rebuilding..." -ForegroundColor Yellow
                    Build-Html | Out-Null
                    Build-Checklist | Out-Null
                    Write-Host "  [SAVE] Done. Refresh browser to load new defaults." -ForegroundColor Green
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                    $res.ContentType = "application/json"
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)

                } elseif ($req.HttpMethod -eq "GET" -and $req.Url.LocalPath -eq "/api/sites") {
                    $res.ContentType = "application/json"
                    $json = Get-SitesApiJson
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)

                } elseif ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -match '^/api/sites/([^/]+)/activate$') {
                    $requestedId = [System.Uri]::UnescapeDataString($Matches[1])
                    if (Set-ActiveSite -SiteId $requestedId) {
                        $res.ContentType = "application/json"
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                        $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    } else {
                        $res.StatusCode = 404
                        $res.ContentType = "application/json"
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":false,"error":"site_not_found"}')
                        $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    }

                } elseif ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -match '^/api/sites/([^/]+)/update-site$') {
                    $targetId = [System.Uri]::UnescapeDataString($Matches[1])
                    $siteFile = Get-SiteFile -SiteId $targetId
                    if ($siteFile) {
                        $bytes = $null
                        try {
                            $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                            $updates = $reader.ReadToEnd() | ConvertFrom-Json
                            $existing = Get-Content $siteFile -Raw -Encoding UTF8 | ConvertFrom-Json
                            $editable = @('legalDescription','yearBuilt','occupancyGroup','projectType','architect','notes','scopeOfWork','inspectors','planningAreas','overlayZones')
                            foreach ($f in $editable) {
                                $prop = $updates.PSObject.Properties[$f]
                                if ($null -ne $prop) {
                                    # StrictMode-safe: use Add_NoteProperty if missing, else set value
                                    $sitePropExists = $null -ne $existing.site.PSObject.Properties[$f]
                                    if ($sitePropExists) {
                                        $existing.site.PSObject.Properties[$f].Value = $prop.Value
                                    } else {
                                        $existing.site | Add-Member -MemberType NoteProperty -Name $f -Value $prop.Value -Force
                                    }
                                }
                            }
                            [System.IO.File]::WriteAllText($siteFile, ($existing | ConvertTo-Json -Depth 10), [System.Text.UTF8Encoding]::new($false))
                            Build-Html   | Out-Null
                            Build-Checklist | Out-Null
                            Write-Host "  [EDIT] Site info updated + rebuilt." -ForegroundColor Cyan
                            $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                        } catch {
                            $bytes = [System.Text.Encoding]::UTF8.GetBytes("{`"ok`":false,`"error`":`"$($_.Exception.Message)`"}")
                        }
                    } else {
                        $res.StatusCode = 404
                        $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":false,"error":"site_not_found"}')
                    }
                    $res.ContentType = "application/json"
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)

                } elseif ($req.HttpMethod -eq "GET" -and $req.Url.LocalPath -eq "/checklist") {
                    $res.ContentType = "text/html; charset=utf-8"
                    $fileBytes = [System.IO.File]::ReadAllBytes($outputChk)
                    $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)

                } elseif ($req.HttpMethod -eq "GET") {
                    $res.ContentType = "text/html; charset=utf-8"
                    $fileBytes = [System.IO.File]::ReadAllBytes($outputMap)
                    $res.OutputStream.Write($fileBytes, 0, $fileBytes.Length)

                } else {
                    $res.StatusCode = 404
                }
            } catch {
                $res.StatusCode = 500
            } finally {
                try { $res.Close() } catch {}
            }
        }
    } finally {
        $listener.Stop()
        Write-Host "  [SERVE] Server stopped." -ForegroundColor DarkGray
    }
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
