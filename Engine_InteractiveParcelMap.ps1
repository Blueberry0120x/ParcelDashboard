# ==========================================
# Master Site Dashboard - Build Script
# Usage:
#   Engine_InteractiveParcelMap.cmd          -> compile only
#   Engine_InteractiveParcelMap.cmd debug    -> compile + open in browser
#   Engine_InteractiveParcelMap.cmd serve    -> compile + local server (enables direct Save Config)
# ==========================================

Set-StrictMode -Version Latest

param([string]$Mode = "reload")

$base         = Split-Path $MyInvocation.MyCommand.Path -Resolve
$src          = Join-Path $base "src"
$shell        = Join-Path $src  "index.html"
$checklistSrc = Join-Path $src  "checklist.html"
$outputDir    = Join-Path $base "Output"
$outputMap    = Join-Path $outputDir "InteractiveMap.html"
$outputChk    = Join-Path $outputDir "PreApp_Checklist.html"
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

# ── site-data.json injection helper ───────────────────────────────────────
# Merges site-data.json.site (static) + .saved (session) into window.__SITE_DEFAULTS__
# Returns the <script> tag string, or "" if nothing to inject
function Get-InjectScript {
    if (-not (Test-Path $siteDataFile)) { return "" }
    try {
        $sd = Get-Content $siteDataFile -Raw -Encoding UTF8 | ConvertFrom-Json
        $merged = [ordered]@{}
        if ($null -ne $sd.site) {
            $sd.site.PSObject.Properties | ForEach-Object { $merged[$_.Name] = $_.Value }
        }
        if ($null -ne $sd.saved) {
            $sd.saved.PSObject.Properties | ForEach-Object { $merged[$_.Name] = $_.Value }
        }
        if ($merged.Count -gt 0) {
            $json = $merged | ConvertTo-Json -Compress -Depth 10
            return "<script>window.__SITE_DEFAULTS__ = $json;</script>"
        }
    } catch {}
    return ""
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

# ── Modes ──────────────────────────────────────────────────────────────────
if ($Mode -eq "debug") {
    Write-Host "  [DEBUG] Opening in browser..." -ForegroundColor Cyan
    Start-Process $outputMap
}

if ($Mode -eq "serve") {
    $port = 7734
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    try { $listener.Start() } catch {
        Write-Host "  [ERROR] Cannot start server on port $port - is it already running?" -ForegroundColor Red
        exit 1
    }

    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  [SERVE] http://localhost:$port           Map" -ForegroundColor Cyan
    Write-Host "          http://localhost:$port/checklist  Checklist" -ForegroundColor Cyan
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

            # CORS — allow browser to POST from localhost
            $res.Headers.Add("Access-Control-Allow-Origin",  "*")
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
                    # Preserve site key: merge incoming saved with existing site data
                    try {
                        $incoming = ConvertFrom-Json -InputObject $body
                        if (Test-Path $siteDataFile) {
                            $existing = Get-Content $siteDataFile -Raw -Encoding UTF8 | ConvertFrom-Json
                            if ($null -ne $existing.site) {
                                $merged = [PSCustomObject]@{
                                    project   = $incoming.project
                                    site      = $existing.site
                                    saved     = $incoming.saved
                                    checklist = $incoming.checklist
                                }
                                $body = $merged | ConvertTo-Json -Depth 10
                            }
                        }
                    } catch {}
                    [System.IO.File]::WriteAllText($siteDataFile, $body, [System.Text.UTF8Encoding]::new($false))
                    Write-Host "  [SAVE] site-data.json updated - rebuilding..." -ForegroundColor Yellow
                    Build-Html | Out-Null
                    Build-Checklist | Out-Null
                    Write-Host "  [SAVE] Done. Refresh browser to load new defaults." -ForegroundColor Green
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
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
