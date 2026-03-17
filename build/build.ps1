<#
.SYNOPSIS
    Compiles modular src/ files into a single dist/InteractiveMap.html

.USAGE
    powershell -ExecutionPolicy Bypass -File build/build.ps1
    powershell -ExecutionPolicy Bypass -File build/build.ps1 -InjectSiteData data/site-data.json

.DESCRIPTION
    1. Reads src/index.html as the shell
    2. Inlines <link href="css/style.css"> -> <style>...</style>
    3. Inlines each <script src="js/..."> -> <script>...</script>
    4. Optionally injects window.__SITE_DEFAULTS__ from site-data.json
    5. Replaces "Development Shell" -> "Compiled Build"
    6. Writes dist/InteractiveMap.html + root copy
#>
param(
    [string]$InjectSiteData = ""
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
# Handle case where script is run from build/ directly
if (-not (Test-Path "$Root\src")) { $Root = Split-Path -Parent $PSScriptRoot }
if (-not (Test-Path "$Root\src")) { $Root = (Get-Item $PSScriptRoot).Parent.FullName }

$Src  = Join-Path $Root "src"
$Dist = Join-Path $Root "dist"

Write-Host "Root: $Root"
Write-Host "Src:  $Src"

# ── Read shell ────────────────────────────────────────────────────────────────
$html = Get-Content (Join-Path $Src "index.html") -Raw -Encoding UTF8

# ── Inline CSS ────────────────────────────────────────────────────────────────
$cssPath = Join-Path $Src "css\style.css"
$css     = Get-Content $cssPath -Raw -Encoding UTF8
$html    = $html -replace '<link\s+rel="stylesheet"\s+href="css/style\.css"\s*/?>', "<style>`n$css</style>"

# ── Inline JS (preserve load order) ──────────────────────────────────────────
$jsFiles = @(
    "engine-config.js",
    "engine-ui.js",
    "engine-map.js",
    "engine-elevation.js",
    "engine-setback.js",
    "engine-export.js",
    "engine-resize.js",
    "bootstrap.js"
)

foreach ($jsFile in $jsFiles) {
    $jsPath = Join-Path $Src "js\$jsFile"
    if (-not (Test-Path $jsPath)) {
        Write-Error "Missing source file: $jsPath"
        exit 1
    }
    $js   = Get-Content $jsPath -Raw -Encoding UTF8
    $tag  = "<script src=`"js/$jsFile`"></script>"
    $html = $html.Replace($tag, "<script>`n$js</script>")
}

# ── Inject site-data.json (optional) ─────────────────────────────────────────
if ($InjectSiteData -and (Test-Path $InjectSiteData)) {
    $siteData  = Get-Content $InjectSiteData -Raw -Encoding UTF8
    $injection = "<script>`nwindow.__SITE_DEFAULTS__ = $($siteData.Trim());`n</script>"
    $html      = $html.Replace("</head>", "$injection`n</head>")
    Write-Host "Injected site-data from: $InjectSiteData"
}

# ── Tag as compiled ───────────────────────────────────────────────────────────
$html = $html.Replace("Development Shell", "Compiled Build")

# ── Write output ──────────────────────────────────────────────────────────────
if (-not (Test-Path $Dist)) { New-Item -ItemType Directory -Path $Dist -Force | Out-Null }

$outPath = Join-Path $Dist "InteractiveMap.html"
[System.IO.File]::WriteAllText($outPath, $html, [System.Text.UTF8Encoding]::new($false))

# Root copy for backwards compat
$rootCopy = Join-Path $Root "InteractiveMap.html"
[System.IO.File]::WriteAllText($rootCopy, $html, [System.Text.UTF8Encoding]::new($false))

$lines = ($html -split "`n").Count
Write-Host "Build complete: $lines lines -> $outPath"
Write-Host "Root copy     -> $rootCopy"
