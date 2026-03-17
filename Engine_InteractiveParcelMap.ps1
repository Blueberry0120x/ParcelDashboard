# ==========================================
# Master Site Dashboard - Build Script
# Usage:
#   Engine_InteractiveParcelMap.cmd          -> compile only
#   Engine_InteractiveParcelMap.cmd debug    -> compile + open in browser
# ==========================================

param([string]$Mode = "reload")

$base    = Split-Path $MyInvocation.MyCommand.Path -Resolve
$src     = Join-Path $base "src"
$shell   = Join-Path $src  "index.html"
$output  = Join-Path $base "InteractiveMap.html"
$dist    = Join-Path $base "dist"
$cssFile = Join-Path $src  "css\style.css"

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

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Master Site Dashboard - Build           " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# --- Read shell HTML ---
if (-not (Test-Path $shell)) {
    Write-Host "  [ERROR] index.html not found: $shell" -ForegroundColor Red
    exit 1
}
$html = Get-Content $shell -Raw -Encoding UTF8

# --- Inline CSS ---
if (-not (Test-Path $cssFile)) {
    Write-Host "  [ERROR] style.css not found: $cssFile" -ForegroundColor Red
    exit 1
}
$cssContent = Get-Content $cssFile -Raw -Encoding UTF8
$html = $html.Replace('<link rel="stylesheet" href="css/style.css" />', "<style>`n$cssContent`n</style>")
Write-Host "  [+] Inlined: css/style.css" -ForegroundColor Green

# --- Inline each engine script ---
foreach ($eng in $engines) {
    $engPath = Join-Path $src ($eng -replace '/', '\')
    if (-not (Test-Path $engPath)) {
        Write-Host "  [WARN] Missing engine (skipped): $eng" -ForegroundColor Yellow
        continue
    }
    $jsContent = Get-Content $engPath -Raw -Encoding UTF8
    $srcTag    = "<script src=`"$eng`"></script>"
    # Also try without js/ prefix for backwards compat

    $inlineTag = "<script>`n$jsContent`n</script>"
    $html = $html.Replace($srcTag, $inlineTag)
    Write-Host "  [+] Inlined: $eng" -ForegroundColor Green
}

# --- Update header comment ---
$html = $html.Replace("Development Shell -->", "Compiled Build -->")
$html = $html.Replace("<!-- Open with Live Server (VS Code Go Live). Run build.cmd to compile to InteractiveMap.html -->", "")

# --- Inject site-data.json settings ---
$siteDataFile = Join-Path $base "data\site-data.json"
if (Test-Path $siteDataFile) {
    try {
        $siteData = Get-Content $siteDataFile -Raw -Encoding UTF8 | ConvertFrom-Json
        if ($null -ne $siteData.saved) {
            $savedJson   = $siteData.saved | ConvertTo-Json -Compress -Depth 10
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

# --- Write output ---
if (-not (Test-Path $dist)) { New-Item -ItemType Directory -Path $dist -Force | Out-Null }
$distOut = Join-Path $dist "InteractiveMap.html"
[System.IO.File]::WriteAllText($output, $html, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText($distOut, $html, [System.Text.UTF8Encoding]::new($false))
Write-Host ""
Write-Host "  [BUILD COMPLETE]" -ForegroundColor Green
Write-Host "  Output: $output" -ForegroundColor White
Write-Host "  Dist:   $distOut" -ForegroundColor White
Write-Host ""

# --- Debug: open in browser ---
if ($Mode -eq "debug") {
    Write-Host "  [DEBUG] Opening in browser..." -ForegroundColor Cyan
    Start-Process $output
}

Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""
