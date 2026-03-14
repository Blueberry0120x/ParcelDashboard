# ==========================================
# Master Site Dashboard - Project Scaffold
# Run via: RUN_SETUP.cmd  (FIXED - no multi-window bug)
# ==========================================

$projectName = "MasterSiteDashboard"
$base = Join-Path (Get-Location) $projectName

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  Master Site Dashboard - Project Setup   " -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# --- Create Folder Structure ---
$folders = @(
    "$base",
    "$base\.vscode",
    "$base\engines",
    "$base\assets",
    "$base\data",
    "$base\exports"
)

foreach ($folder in $folders) {
    if (-Not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder | Out-Null
        Write-Host "  [+] Created: $($folder.Replace($base,'.'))" -ForegroundColor Green
    } else {
        Write-Host "  [=] Exists:  $($folder.Replace($base,'.'))" -ForegroundColor Yellow
    }
}

Write-Host ""

# --- Create Placeholder Files ---
$files = @{
    "$base\index.html"               = "<!-- Master Site Dashboard - Shell -->`n"
    "$base\assets\style.css"         = "/* Global Styles */"
    "$base\engines\engine-config.js" = "// ENGINE: Site Configuration and Data"
    "$base\engines\engine-map.js"    = "// ENGINE: Leaflet Map Init, Shapes, Drag"
    "$base\engines\engine-align.js"  = "// ENGINE: Rotation, Snap, Flyout Panel"
    "$base\engines\engine-export.js" = "// ENGINE: LISP Export, Image Export"
    "$base\engines\engine-ui.js"     = "// ENGINE: Banner, Concept Panel, Toggles"
    "$base\data\site-data.json"      = "{`n  `"project`": `"Master Site Dashboard`"`n}"
    "$base\exports\.gitkeep"         = ""
    "$base\README.md"                = "# Master Site Dashboard`n`nOpen index.html with Live Server (Go Live button, bottom bar)."
}

foreach ($file in $files.GetEnumerator()) {
    if (-Not (Test-Path $file.Key)) {
        New-Item -ItemType File -Path $file.Key -Force | Out-Null
        Set-Content -Path $file.Key -Value $file.Value -Encoding UTF8
        Write-Host "  [+] Created: $($file.Key.Replace($base,'.'))" -ForegroundColor Green
    } else {
        Write-Host "  [=] Exists:  $($file.Key.Replace($base,'.'))" -ForegroundColor Yellow
    }
}

Write-Host ""

# --- Write VS Code Extension Recommendations ---
# VS Code will show "Install Recommended Extensions?" popup on open.
# This replaces all CLI installs -- zero extra windows.
$extensionsJson = @'
{
  "recommendations": [
    "ritwickdey.LiveServer",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ecmel.vscode-html-css",
    "naumovs.color-highlight",
    "christian-kohler.path-intellisense",
    "usernamehw.errorlens",
    "eamodio.gitlens",
    "aaron-bond.better-comments",
    "formulahendry.auto-rename-tag"
  ]
}
'@

$extPath = "$base\.vscode\extensions.json"
Set-Content -Path $extPath -Value $extensionsJson -Encoding UTF8
Write-Host "  [+] Created: .vscode\extensions.json" -ForegroundColor Green
Write-Host "      (VS Code will prompt to install all extensions on open)" -ForegroundColor Gray

Write-Host ""

# --- Open VS Code ONCE ---
Write-Host "  Opening VS Code..." -ForegroundColor Cyan
Start-Process "code" -ArgumentList "`"$base`""

Write-Host ""
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "  DONE. Project folder created at:"        -ForegroundColor Green
Write-Host "  $base"                                    -ForegroundColor White
Write-Host ""
Write-Host "  Next steps in VS Code:"                  -ForegroundColor Gray
Write-Host "  1. Click [Install] on the extension popup" -ForegroundColor Gray
Write-Host "  2. Open index.html"                      -ForegroundColor Gray
Write-Host "  3. Click Go Live (bottom right bar)"     -ForegroundColor Gray
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""