# ==========================================
# Master Site Dashboard - Build Script
# Usage:
#   Engine_InteractiveParcelMap.cmd          -> compile only
#   Engine_InteractiveParcelMap.cmd debug    -> compile + open in browser
#   Engine_InteractiveParcelMap.cmd serve    -> compile + local server (enables direct Save Config)
# ==========================================

param([string]$Mode = "reload")

$base    = Split-Path $MyInvocation.MyCommand.Path -Resolve
$src     = Join-Path $base "src"
$shell   = Join-Path $src  "index.html"
$output  = Join-Path $base "InteractiveMap.html"
$dist    = Join-Path $base "dist"
$cssFile = Join-Path $src  "css\style.css"
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

# ── Build function ─────────────────────────────────────────────────────────
function Build-Html {
    Write-Host ""
    Write-Host "===========================================" -ForegroundColor Cyan
    Write-Host "  Master Site Dashboard - Build           " -ForegroundColor Cyan
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

    # Inject site-data.json
    if (Test-Path $siteDataFile) {
        try {
            $siteData = Get-Content $siteDataFile -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($null -ne $siteData.saved) {
                $savedJson    = $siteData.saved | ConvertTo-Json -Compress -Depth 10
                $injectScript = "<script>window.__SITE_DEFAULTS__ = $savedJson;</script>"
                $html = $html.Replace('</head>', "$injectScript`n</head>")
                Write-Host "  [+] Injected settings from site-data.json" -ForegroundColor Green
            } else {
                Write-Host "  [i] site-data.json has no saved settings (using defaults)" -ForegroundColor DarkGray
            }
        } catch {
            Write-Host "  [WARN] Could not parse site-data.json: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [i] No site-data.json found (using defaults)" -ForegroundColor DarkGray
    }

    if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist -Force | Out-Null }
    [System.IO.File]::WriteAllText($output,  $html, [System.Text.UTF8Encoding]::new($false))
    [System.IO.File]::WriteAllText((Join-Path $dist "InteractiveMap.html"), $html, [System.Text.UTF8Encoding]::new($false))

    Write-Host ""
    Write-Host "  [BUILD COMPLETE]" -ForegroundColor Green
    Write-Host "  Output: $output" -ForegroundColor White
    Write-Host "  Dist:   $(Join-Path $dist 'InteractiveMap.html')" -ForegroundColor White
    Write-Host ""
    return $true
}

# ── Initial build ──────────────────────────────────────────────────────────
$ok = Build-Html
if (-not $ok) { exit 1 }

# ── Modes ──────────────────────────────────────────────────────────────────
if ($Mode -eq "debug") {
    Write-Host "  [DEBUG] Opening in browser..." -ForegroundColor Cyan
    Start-Process $output
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
    Write-Host "  [SERVE] http://localhost:$port" -ForegroundColor Cyan
    Write-Host "  Save Config in the browser writes directly to site-data.json" -ForegroundColor Green
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

                } elseif ($req.HttpMethod -eq "POST" -and $req.Url.LocalPath -eq "/save") {
                    # Write site-data.json, then rebuild so next refresh gets fresh defaults
                    $reader = New-Object System.IO.StreamReader($req.InputStream, [System.Text.Encoding]::UTF8)
                    $body   = $reader.ReadToEnd()
                    [System.IO.File]::WriteAllText($siteDataFile, $body, [System.Text.UTF8Encoding]::new($false))
                    Write-Host "  [SAVE] site-data.json updated - rebuilding..." -ForegroundColor Yellow
                    Build-Html | Out-Null
                    Write-Host "  [SAVE] Done. Refresh browser to load new defaults." -ForegroundColor Green
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes('{"ok":true}')
                    $res.ContentType = "application/json"
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)

                } elseif ($req.HttpMethod -eq "GET") {
                    $res.ContentType = "text/html; charset=utf-8"
                    $fileBytes = [System.IO.File]::ReadAllBytes($output)
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
