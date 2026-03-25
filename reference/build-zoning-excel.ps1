# ZoningCodeLibrary.xlsx -- 2-way sync: JSON <-> Excel
#
# Single master workbook, one tab per state, one ROW per site.
# Columns = site identity fields (transposed from vertical card view).
#
# EXPORT (default): data/sites/*.json -> ZoningCodeLibrary.xlsx
# IMPORT:           ZoningCodeLibrary.xlsx -> data/sites/*.json (.site key only)
#
# Usage:
#   .\build-zoning-excel.ps1              # export all sites
#   .\build-zoning-excel.ps1 -Mode import # import all rows -> JSON

param(
    [ValidateSet("export","import")]
    [string]$Mode = "export"
)

Set-StrictMode -Version Latest

# ── Shared engine (COM cleanup helpers) ───────────────────────────────────
$sharedMod = "C:\Users\napham\OneDrive - Stantec\NP_OutlookTeamSuite\Engine\Shared\NPSTN_Shared.psm1"
if (Test-Path $sharedMod) {
    Import-Module $sharedMod -Force -ErrorAction SilentlyContinue
} else {
    # Fallback stubs so the script still runs standalone
    function Remove-ComObjects {
        param([object[]]$Objects)
        foreach ($o in $Objects) {
            if ($null -ne $o) {
                try { if ($o.PSObject.Methods.Match('Quit')) { $o.Quit() } } catch {}
                try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($o) | Out-Null } catch {}
            }
        }
        [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers()
    }
    function Clear-OfficeGhosts { [System.GC]::Collect(); [System.GC]::WaitForPendingFinalizers() }
}

$base     = Split-Path $PSScriptRoot -Parent
$sitesDir = Join-Path $base "data\sites"
$xlPath   = Join-Path $PSScriptRoot "ZoningCodeLibrary.xlsx"

# ── Column definitions (order = Excel column order) ───────────────────────
# Each entry: @{ key = JSON field; label = header; type = string|number|bool }
$COLUMNS = @(
    @{ key="siteId";                  label="Site ID";              type="string" }
    @{ key="address";                 label="Address";              type="string" }
    @{ key="apn";                     label="APN";                  type="string" }
    @{ key="zoning";                  label="Zoning";               type="string" }
    @{ key="cadZone";                 label="CAD Zone";             type="string" }
    @{ key="projectType";             label="Project Type";         type="string" }
    @{ key="architect";               label="Architect";            type="string" }
    @{ key="lotWidth";                label="Lot Width (ft)";       type="number" }
    @{ key="lotDepth";                label="Lot Depth (ft)";       type="number" }
    @{ key="lotSF";                   label="Lot SF";               type="number" }
    @{ key="lotAcres";                label="Lot Acres";            type="number" }
    @{ key="lotWidthSouth";           label="Lot Width S (ft)";     type="number" }
    @{ key="lotWidthNorth";           label="Lot Width N (ft)";     type="number" }
    @{ key="lotDepthWest";            label="Lot Depth W (ft)";     type="number" }
    @{ key="lotDepthEast";            label="Lot Depth E (ft)";     type="number" }
    @{ key="commercialDepth";         label="Comm Depth (ft)";      type="number" }
    @{ key="baseFAR";                 label="Base FAR";             type="number" }
    @{ key="commFAR";                 label="CCHS FAR";             type="number" }
    @{ key="maxHeight";               label="Max Height (ft)";      type="number" }
    @{ key="baseHeightLimit";         label="Base Ht Limit (ft)";   type="number" }
    @{ key="cchsMaxHeight";           label="CCHS Max Ht (ft)";     type="number" }
    @{ key="frontSetback";            label="Front Setback (ft)";   type="number" }
    @{ key="rearSetback";             label="Rear Setback (ft)";    type="number" }
    @{ key="sideSetback";             label="Side Setback (ft)";    type="number" }
    @{ key="densityPerSF";            label="Density (SF/DU)";      type="number" }
    @{ key="nefRatePerSF";            label="NEF Rate ($/SF)";      type="number" }
    @{ key="affordabilityPct";        label="Affordability %";      type="number" }
    @{ key="difPerUnit";              label="DIF/Unit ($)";         type="number" }
    @{ key="difWaiverSF";             label="DIF Waiver (SF)";      type="number" }
    @{ key="unitCount";               label="Unit Count";           type="number" }
    @{ key="unitDensity";             label="Unit Density (DU/AC)"; type="number" }
    @{ key="densityBonus";            label="Density Bonus";        type="bool"   }
    @{ key="cornerVisibilityTriangle";label="Corner Vis Triangle";  type="bool"   }
    @{ key="cornerVisTriSize";        label="Corner Vis Size (ft)"; type="number" }
    @{ key="cornerVisCorner";         label="Corner Vis Corner";    type="string" }
    @{ key="notes";                   label="Notes";                type="string" }
)

# ── Helper: get a safe value from a PSObject property ─────────────────────
function Get-Val($obj, $key, $default="") {
    $p = $obj.PSObject.Properties[$key]
    if ($null -eq $p -or $null -eq $p.Value) { return $default }
    return $p.Value
}

# ── Helper: state code from siteId (e.g. "CA-EUCLID" -> "CA") ─────────────
function Get-StateCode($siteId) {
    if ($siteId -match '^([A-Z]{2})-') { return $Matches[1] }
    return "OTHER"
}

# ── Load all site JSON files -> group by state ────────────────────────────
function Load-AllSites {
    $groups = @{}
    $files = Get-ChildItem $sitesDir -Filter "*.json" -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($null -eq $raw.site) { continue }
            $sid   = "$(Get-Val $raw.site 'siteId')"
            $state = Get-StateCode $sid
            if (-not $groups.ContainsKey($state)) { $groups[$state] = @() }
            $groups[$state] += [PSCustomObject]@{ site=$raw.site; file=$f.FullName }
        } catch {}
    }
    return $groups
}

# ── Excel helpers ──────────────────────────────────────────────────────────
function Style-Header($ws, $colCount) {
    $rng = $ws.Range($ws.Cells.Item(1,1), $ws.Cells.Item(1,$colCount))
    $rng.Interior.Color  = 0x0F4C81
    $rng.Font.Bold       = $true
    $rng.Font.Color      = 0xFFFFFF
    $rng.Font.Size       = 10
    $rng.WrapText        = $false
}

function Style-DataRow($ws, $row, $colCount, $alt) {
    if ($alt) {
        $rng = $ws.Range($ws.Cells.Item($row,1), $ws.Cells.Item($row,$colCount))
        $rng.Interior.Color = 0xF0F4F8
    }
}

# ── EXPORT ────────────────────────────────────────────────────────────────
function Export-All {
    $groups = Load-AllSites
    if ($groups.Count -eq 0) { Write-Host "[ERROR] No site JSON files found in $sitesDir" -ForegroundColor Red; return }

    Write-Host "EXPORT -> $xlPath" -ForegroundColor Cyan
    $colCount = $COLUMNS.Count

    $app = $null; $wb = $null
    try {
        Clear-OfficeGhosts
        $app = New-Object -ComObject Excel.Application
        $app.Visible = $false; $app.DisplayAlerts = $false
        $wb  = $app.Workbooks.Add()

        # Remove default sheets later; add one per state
        $firstSheet = $true
        foreach ($state in ($groups.Keys | Sort-Object)) {
            $sites = $groups[$state]

            # Add or reuse sheet
            if ($firstSheet) {
                $ws = $wb.Worksheets.Item(1)
                $ws.Name = $state
                $firstSheet = $false
            } else {
                $ws = $wb.Worksheets.Add([System.Reflection.Missing]::Value, $wb.Worksheets.Item($wb.Worksheets.Count))
                $ws.Name = $state
            }

            # Header row
            for ($c = 1; $c -le $colCount; $c++) {
                $ws.Cells.Item(1, $c) = $COLUMNS[$c-1].label
            }
            Style-Header $ws $colCount

            # Freeze header row
            $ws.Application.ActiveWindow.SplitRow = 1
            $ws.Application.ActiveWindow.FreezePanes = $true

            # Data rows
            $row = 2
            foreach ($entry in $sites) {
                $s = $entry.site
                for ($c = 1; $c -le $colCount; $c++) {
                    $col = $COLUMNS[$c-1]
                    $val = Get-Val $s $col.key ""
                    if ($col.type -eq "bool") {
                        $ws.Cells.Item($row, $c) = if ($val -eq $true) { "Yes" } else { "No" }
                    } elseif ($col.type -eq "number") {
                        $n = 0.0
                        if ([double]::TryParse("$val", [ref]$n)) {
                            $ws.Cells.Item($row, $c) = $n
                        } else {
                            $ws.Cells.Item($row, $c) = 0
                        }
                    } else {
                        $ws.Cells.Item($row, $c) = "$val"
                    }
                }
                Style-DataRow $ws $row $colCount ($row % 2 -eq 0)
                $row++
            }

            $ws.Columns.AutoFit() | Out-Null
            Write-Host "  [$state] $($sites.Count) site(s)" -ForegroundColor Green
        }

        # Remove extra blank sheets Excel added
        while ($wb.Worksheets.Count -gt $groups.Count) {
            $wb.Worksheets.Item($wb.Worksheets.Count).Delete()
        }

        if (Test-Path $xlPath) { Remove-Item $xlPath -Force }
        $wb.SaveAs($xlPath, 51)
        Write-Host "DONE: $xlPath" -ForegroundColor Green

    } finally {
        if ($wb) { try { $wb.Close($false) } catch {} }
        Remove-ComObjects @($wb, $app)
    }
}

# ── IMPORT ────────────────────────────────────────────────────────────────
function Import-All {
    if (-not (Test-Path $xlPath)) {
        Write-Host "[ERROR] Not found: $xlPath -- run export first" -ForegroundColor Red
        return
    }
    Write-Host "IMPORT <- $xlPath" -ForegroundColor Cyan

    # Build siteId -> file path index
    $siteIndex = @{}
    $files = Get-ChildItem $sitesDir -Filter "*.json" -ErrorAction SilentlyContinue
    foreach ($f in $files) {
        try {
            $raw = Get-Content $f.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
            if ($null -eq $raw.site) { continue }
            $sid = "$(Get-Val $raw.site 'siteId')"
            if ($sid -ne "") { $siteIndex[$sid] = $f.FullName }
        } catch {}
    }

    $numericFields = $COLUMNS | Where-Object { $_.type -eq "number" } | ForEach-Object { $_.key }
    $boolFields    = $COLUMNS | Where-Object { $_.type -eq "bool"   } | ForEach-Object { $_.key }

    $app = $null; $wb = $null
    try {
        Clear-OfficeGhosts
        $app = New-Object -ComObject Excel.Application
        $app.Visible = $false; $app.DisplayAlerts = $false
        $wb  = $app.Workbooks.Open($xlPath, 0, $true)

        foreach ($ws in $wb.Worksheets) {
            Write-Host "  Reading tab: $($ws.Name)" -ForegroundColor DarkGray

            # Build column index from header row
            $colIndex = @{}
            $lastCol = $ws.UsedRange.Columns.Count
            for ($c = 1; $c -le $lastCol; $c++) {
                $lbl = "$($ws.Cells.Item(1,$c).Value2)"
                if ($lbl -ne "") { $colIndex[$lbl] = $c }
            }

            # Read each data row
            $lastRow = $ws.UsedRange.Rows.Count
            for ($r = 2; $r -le $lastRow; $r++) {
                # Find siteId column
                $sidCol = if ($colIndex.ContainsKey("Site ID")) { $colIndex["Site ID"] } else { 1 }
                $sid = "$($ws.Cells.Item($r, $sidCol).Value2)"
                if ($sid -eq "" -or $null -eq $sid) { continue }

                if (-not $siteIndex.ContainsKey($sid)) {
                    Write-Host "  [WARN] $sid not found in data/sites/ -- skipping" -ForegroundColor Yellow
                    continue
                }

                $jsonPath = $siteIndex[$sid]
                $raw = Get-Content $jsonPath -Raw -Encoding UTF8 | ConvertFrom-Json

                # Update each column's field in .site
                foreach ($col in $COLUMNS) {
                    $lbl = $col.label
                    if (-not $colIndex.ContainsKey($lbl)) { continue }
                    $cellVal = $ws.Cells.Item($r, $colIndex[$lbl]).Value2

                    if ($boolFields -contains $col.key) {
                        $v = "$cellVal" -eq "Yes" -or "$cellVal" -eq "TRUE" -or "$cellVal" -eq "1"
                    } elseif ($numericFields -contains $col.key) {
                        $n = 0.0
                        $v = if ([double]::TryParse("$cellVal", [ref]$n)) { $n } else { 0.0 }
                    } else {
                        $v = "$cellVal"
                    }

                    $prop = $raw.site.PSObject.Properties[$col.key]
                    if ($null -ne $prop) { $prop.Value = $v }
                    else { $raw.site | Add-Member -NotePropertyName $col.key -NotePropertyValue $v -Force }
                }

                $out = $raw | ConvertTo-Json -Depth 10
                [System.IO.File]::WriteAllText($jsonPath, $out, [System.Text.UTF8Encoding]::new($false))
                Write-Host "  Updated: $sid" -ForegroundColor Green
            }
        }

    } finally {
        if ($wb) { try { $wb.Close($false) } catch {} }
        Remove-ComObjects @($wb, $app)
    }
    Write-Host "DONE" -ForegroundColor Green
}

# ── Main ──────────────────────────────────────────────────────────────────
if ($Mode -eq "import") { Import-All } else { Export-All }
