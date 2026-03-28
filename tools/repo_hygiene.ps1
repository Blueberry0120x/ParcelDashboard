param(
    [switch]$Apply,
    [string]$Reason = 'stale-cleanup'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$dateStamp = Get-Date -Format 'yyyy-MM-dd'
$archiveRoot = Join-Path $repoRoot ("config/archive/{0}_{1}" -f $dateStamp, $Reason)

# Conservative stale-file patterns. Add patterns only when they are high-confidence junk.
$staleRegex = '(?i)(\.(bak|old|orig|tmp)$|~$|^Thumbs\.db$|^\.DS_Store$)'

$excludedPathRegex = '(?i)\\\.git(\\|$)|\\config\\archive(\\|$)'

$staleFiles = @(
    Get-ChildItem -Path $repoRoot -Recurse -Force -File |
        Where-Object {
            $_.Name -match $staleRegex -and
            $_.FullName -notmatch $excludedPathRegex
        }
)

# Optional archival for timestamped checklist backups if the folder reappears.
$backupFolder = Join-Path $repoRoot 'config/backup'
$timestampedBackups = @()
if (Test-Path $backupFolder) {
    $timestampedBackups = @(
        Get-ChildItem -Path $backupFolder -File -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^preapp-checklist-\d{4}-\d{2}-\d{2}_\d{6}\.json$' }
    )
}

$emptyCandidates = @(
    (Join-Path $repoRoot 'config/backup'),
    (Join-Path $repoRoot 'report'),
    (Join-Path $repoRoot '.claude/report')
)

$emptyDirs = @(
    $emptyCandidates |
        Where-Object { Test-Path $_ } |
        Where-Object { @(Get-ChildItem -LiteralPath $_ -Force).Count -eq 0 }
)

Write-Host "Repo hygiene scan: $repoRoot"
if ($Apply) {
    Write-Host 'Mode: Apply'
} else {
    Write-Host 'Mode: DryRun'
}
Write-Host ''

Write-Host "Stale files found: $($staleFiles.Count)"
$staleFiles | ForEach-Object { Write-Host " - $($_.FullName)" }
Write-Host ''

Write-Host "Timestamped checklist backups in config/backup: $($timestampedBackups.Count)"
$timestampedBackups | ForEach-Object { Write-Host " - $($_.FullName)" }
Write-Host ''

Write-Host "Empty stale directories found: $($emptyDirs.Count)"
$emptyDirs | ForEach-Object { Write-Host " - $_" }
Write-Host ''

if (-not $Apply) {
    Write-Host 'Dry run only. Re-run with -Apply to archive/remove candidates.'
    exit 0
}

if ($staleFiles.Count -gt 0 -or $timestampedBackups.Count -gt 0) {
    if (-not (Test-Path $archiveRoot)) {
        New-Item -ItemType Directory -Path $archiveRoot -Force | Out-Null
    }
}

# Archive stale files with relative path preservation.
foreach ($file in $staleFiles) {
    $relative = $file.FullName.Substring($repoRoot.Length).TrimStart('\\')
    $dest = Join-Path $archiveRoot $relative
    $destDir = Split-Path -Parent $dest
    if (-not (Test-Path $destDir)) {
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    }
    Move-Item -LiteralPath $file.FullName -Destination $dest -Force
}

# Archive timestamped checklist backups to the archive root directly.
foreach ($file in $timestampedBackups) {
    $dest = Join-Path $archiveRoot $file.Name
    Move-Item -LiteralPath $file.FullName -Destination $dest -Force
}

# Remove known-empty clutter directories.
foreach ($dir in $emptyDirs) {
    if (Test-Path $dir) {
        if (@(Get-ChildItem -LiteralPath $dir -Force).Count -eq 0) {
            Remove-Item -LiteralPath $dir -Recurse -Force
        }
    }
}

Write-Host 'Apply complete.'
if (Test-Path $archiveRoot) {
    Write-Host "Archive folder: $archiveRoot"
}
