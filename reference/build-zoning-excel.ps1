Set-StrictMode -Version Latest

# Build ZoningCodeLibrary.xlsx -- Dynamic from site-data.json
# Reads the active site config and generates a per-site zoning workbook.

$base     = Split-Path $PSScriptRoot -Parent
$siteJson = Join-Path (Join-Path $base "data") "site-data.json"

if (-not (Test-Path $siteJson)) {
    Write-Host "[ERROR] data/site-data.json not found. Run build.py or activate a site first."
    exit 1
}

$raw  = Get-Content $siteJson -Raw -Encoding UTF8
$data = $raw | ConvertFrom-Json
$s    = $data.site

# ── Derived values ───────────────────────────────────────────────────────
$siteId     = if ($s.siteId) { $s.siteId } else { "UNKNOWN" }
$addr       = if ($s.address) { $s.address } else { "--" }
$apn        = if ($s.apn) { $s.apn } else { "--" }
$zoning     = if ($s.zoning) { $s.zoning } else { "--" }
$lotW       = if ($s.lotWidth)  { $s.lotWidth }  else { 0 }
$lotD       = if ($s.lotDepth)  { $s.lotDepth }  else { 0 }
$lotSF      = if ($s.lotSF -and $s.lotSF -gt 0) { $s.lotSF } else { $lotW * $lotD }
$lotAcres   = [math]::Round($lotSF / 43560, 2)
$commD      = if ($null -ne $s.commercialDepth) { $s.commercialDepth } else { 0 }
$baseFAR    = if ($null -ne $s.baseFAR) { $s.baseFAR } else { 0 }
$commFAR    = if ($null -ne $s.commFAR) { $s.commFAR } else { 0 }
$maxHt      = if ($null -ne $s.maxHeight) { $s.maxHeight } else { 0 }
$baseHtLim  = if ($null -ne $s.baseHeightLimit) { $s.baseHeightLimit } else { $maxHt }
$cchsMaxHt  = if ($null -ne $s.cchsMaxHeight) { $s.cchsMaxHeight } else { 0 }
$fSb        = if ($null -ne $s.frontSetback) { $s.frontSetback } else { 0 }
$rSb        = if ($null -ne $s.rearSetback) { $s.rearSetback } else { 0 }
$sSb        = if ($null -ne $s.sideSetback) { $s.sideSetback } else { 0 }
$densSF     = if ($null -ne $s.densityPerSF) { $s.densityPerSF } else { 0 }
$nefRate    = if ($null -ne $s.nefRatePerSF) { $s.nefRatePerSF } else { 0 }
$affPct     = if ($null -ne $s.affordabilityPct) { $s.affordabilityPct } else { 0 }
$difUnit    = if ($null -ne $s.difPerUnit) { $s.difPerUnit } else { 0 }
$difWaiver  = if ($null -ne $s.difWaiverSF) { $s.difWaiverSF } else { 0 }
$projType   = if ($s.projectType) { $s.projectType } else { "--" }
$architect  = if ($s.architect) { $s.architect } else { "--" }
$notes      = if ($s.notes) { $s.notes } else { "" }
$unitCount  = if ($null -ne $s.unitCount) { $s.unitCount } else { 0 }
$unitDens   = if ($null -ne $s.unitDensity) { $s.unitDensity } else { 0 }
$densBonus  = if ($null -ne $s.densityBonus) { $s.densityBonus } else { $false }
$cvt        = if ($null -ne $s.cornerVisibilityTriangle) { $s.cornerVisibilityTriangle } else { $false }
$cvtSize    = if ($null -ne $s.cornerVisTriSize) { $s.cornerVisTriSize } else { 0 }
$cvtCorner  = if ($s.cornerVisCorner) { $s.cornerVisCorner } else { "--" }

# Computed
$baseBuildable = if ($baseFAR -gt 0) { [math]::Round($lotSF * $baseFAR) } else { 0 }
$cchsBuildable = if ($commFAR -gt 0) { [math]::Round($lotSF * $commFAR) } else { 0 }
$maxDU         = if ($densSF -gt 0) { [math]::Floor($lotSF / $densSF) } else { 0 }
$nefTotal      = if ($nefRate -gt 0) { [math]::Round($nefRate * $lotSF) } else { 0 }
$affUnits      = if ($affPct -gt 0 -and $maxDU -gt 0) { [math]::Ceiling($maxDU * $affPct) } else { 0 }
$sdbBonus      = if ($maxDU -gt 0) { $maxDU + [math]::Ceiling($maxDU * 0.2) } else { 0 }
$sdbBuildable  = if ($baseFAR -gt 0) { [math]::Round($lotSF * $baseFAR * 1.2) } else { 0 }

$xlPath = Join-Path $PSScriptRoot "$siteId-ZoningCodeLibrary.xlsx"

Write-Host "Building workbook for: $siteId ($addr)"
Write-Host "  Lot: $lotW x $lotD = $($lotSF.ToString('N0')) SF"

$app = $null; $wb = $null

function Set-Cell($ws,$r,$c,$v){ $ws.Cells.Item($r,$c) = $v }

function Style-Header($ws,$r1,$c1,$r2,$c2){
    $rng = $ws.Range($ws.Cells.Item($r1,$c1),$ws.Cells.Item($r2,$c2))
    $rng.Interior.Color = 0x0F4C81
    $rng.Font.Bold = $true; $rng.Font.Color = 0xFFFFFF; $rng.Font.Size = 10
}

function Style-Section($ws,$row,$cols,$bg=0x1E3A5F){
    $rng = $ws.Range($ws.Cells.Item($row,1),$ws.Cells.Item($row,$cols))
    $rng.Interior.Color = $bg; $rng.Font.Color = 0xFFFFFF
    $rng.Font.Bold = $true; $rng.Font.Size = 9
}

function Style-Alt($ws,$row,$cols){
    $rng = $ws.Range($ws.Cells.Item($row,1),$ws.Cells.Item($row,$cols))
    $rng.Interior.Color = 0xF0F4F8
}

# Helper: format "N/A" for zero values
function FmtOrNA($v, $fmt="") {
    if ($v -eq 0) { return "N/A" }
    if ($fmt) { return $v.ToString($fmt) }
    return "$v"
}

try {
    $app = New-Object -ComObject Excel.Application
    $app.Visible = $false; $app.DisplayAlerts = $false
    $wb = $app.Workbooks.Add()

    # ── SHEET 1: SITE SUMMARY ─────────────────────────────────────────
    $s1 = $wb.Worksheets.Item(1); $s1.Name = "Site Summary"
    $h = @("Field","Value","Unit","Notes")
    for($c=1;$c -le 4;$c++){ Set-Cell $s1 1 $c $h[$c-1] }
    Style-Header $s1 1 1 1 4

    $densLabel = if ($densSF -gt 0) { "1 DU per $densSF SF = floor($lotSF/$densSF)" } else { "Per zoning overlay" }
    $lotDimNote = "$lotW x $lotD" + $(if ($lotSF -ne ($lotW * $lotD)) { " (surveyed: $($lotSF.ToString('N0')) SF)" } else { "" })

    $rows = @(
      ,@("PROJECT")
      ,@("Project Name","Master Site Dashboard","","")
      ,@("Site ID","$siteId","","")
      ,@("Address","$addr","","")
      ,@("APN","$apn","","Assessor Parcel Number")
      ,@("Zoning","$zoning","","")
      ,@("Project Type","$projType","","")
      ,@("Architect","$architect","","")
      ,@("")
      ,@("LOT DIMENSIONS")
      ,@("Lot Width","$lotW","ft","")
      ,@("Lot Depth","$lotD","ft","")
      ,@("Lot SF","$($lotSF.ToString('N0'))","SF","$lotDimNote")
      ,@("Lot Acres","$lotAcres","AC","")
      ,@("")
      ,@("BASE ZONE LIMITS")
      ,@("Base FAR","$(FmtOrNA $baseFAR)","ratio","$(if ($baseBuildable -gt 0) { "Max buildable = $($baseBuildable.ToString('N0')) SF" } else { 'Not applicable' })")
      ,@("Max Height","$(FmtOrNA $baseHtLim)","ft","$zoning")
      ,@("Max Density","$(if ($maxDU -gt 0) { $maxDU } else { 'Per zoning' })","DU","$densLabel")
      ,@("Density Factor","$(FmtOrNA $densSF)","SF/DU","")
      ,@("Commercial Depth","$(if ($commD -gt 0) { $commD } else { 'N/A' })","ft","$(if ($commD -gt 0) { 'From front property line' } else { 'No commercial zone' })")
      ,@("Front Setback","$fSb","ft","")
      ,@("Rear Setback","$rSb","ft","")
      ,@("Side Setback","$sSb","ft","$(if ($sSb -eq 0) { 'Zero lot line' } else { '' })")
    )

    # CCHS section (only if site has CCHS data)
    if ($cchsMaxHt -gt 0 -or $commFAR -gt 0) {
        $rows += ,@("")
        $rows += ,@("CCHS / OVERLAY LIMITS")
        $rows += ,@("CCHS FAR","$(FmtOrNA $commFAR)","ratio","$(if ($cchsBuildable -gt 0) { "Max buildable = $($cchsBuildable.ToString('N0')) SF" } else { '' })")
        $rows += ,@("CCHS Max Height","$(FmtOrNA $cchsMaxHt)","ft","")
        $rows += ,@("CCHS Density","Unlimited","DU","No density cap")
        $rows += ,@("Affordability","$([math]::Round($affPct * 100))%","of pre-bonus base DU","$(if ($affUnits -gt 0) { "~$affUnits units at $maxDU DU base" } else { '' })")
    }

    # Fees section (only if site has fee data)
    if ($nefRate -gt 0 -or $difUnit -gt 0) {
        $rows += ,@("")
        $rows += ,@("FEES")
        if ($nefRate -gt 0) {
            $rows += ,@("NEF Rate","$nefRate","$/SF","Waived if 100% affordable")
            $rows += ,@("NEF Total (site)","$($nefTotal.ToString('N0'))","$","$nefRate x $($lotSF.ToString('N0')) SF")
        }
        if ($difUnit -gt 0) {
            $rows += ,@("DIF per Market Unit","$($difUnit.ToString('N0'))","$","Estimate. Verify with DIF Calculator.")
        }
        if ($difWaiver -gt 0) {
            $rows += ,@("DIF Waiver Threshold","$difWaiver","SF","Units <=$difWaiver SF: DIF waived")
        }
    }

    # Corner visibility triangle (if applicable)
    if ($cvt) {
        $rows += ,@("")
        $rows += ,@("SITE FEATURES")
        $rows += ,@("Corner Visibility Triangle","Yes","","$cvtSize ft at $cvtCorner corner")
    }

    # Density bonus (if applicable)
    if ($densBonus) {
        $rows += ,@("Density Bonus","Applied","","")
    }

    # Unit count (if set)
    if ($unitCount -gt 0) {
        if (-not $densBonus -and -not $cvt) {
            $rows += ,@("")
            $rows += ,@("SITE FEATURES")
        }
        $rows += ,@("Unit Count","$unitCount","DU","$($unitDens.ToString('N2')) DU/AC")
    }

    # Notes
    if ($notes) {
        $rows += ,@("")
        $rows += ,@("NOTES")
        $rows += ,@("","$notes","","")
    }

    # SB 330 (California sites only)
    if ($addr -match "CA\s+\d{5}" -or $addr -match "California") {
        $rows += ,@("")
        $rows += ,@("SB 330 (CALIFORNIA)")
        $rows += ,@("Min Residential %","66.7","%","Project must be >=66.7% resi by SF")
        $rows += ,@("Vesting Window","180","days","Standards frozen from filing date")
        $rows += ,@("Construction Start","2.5","years","From final approval. AB 130 permanent.")
    }

    $r = 2
    foreach ($row in $rows) {
        if ($row.Count -le 1) {
            if ($row[0] -ne "") {
                Set-Cell $s1 $r 1 $row[0]
                Style-Section $s1 $r 4
            }
        } else {
            for($c=1;$c -le [Math]::Min($row.Count,4);$c++){ Set-Cell $s1 $r $c $row[$c-1] }
            if ($r % 2 -eq 0) { Style-Alt $s1 $r 4 }
        }
        $r++
    }
    $s1.Columns.AutoFit() | Out-Null

    # ── SHEET 2: ZONING CODE LIBRARY ──────────────────────────────────
    $s2 = $wb.Worksheets.Add([System.Reflection.Missing]::Value,$s1)
    $s2.Name = "Zoning Code Library"
    $h2 = @("ID","Category","Code / Section","Parameter","Value","Unit / Condition","Pathway","Source PDF","Notes")
    for($c=1;$c -le 9;$c++){ Set-Cell $s2 1 $c $h2[$c-1] }
    Style-Header $s2 1 1 1 9

    $cRows = @(
      ,@("C-01","FAR","$zoning","Base Zone FAR","$(FmtOrNA $baseFAR)","ratio","Base Zone","--","$(if ($baseBuildable -gt 0) { "Max buildable $($baseBuildable.ToString('N0')) SF on $($lotSF.ToString('N0')) SF lot" } else { 'N/A' })")
      ,@("C-02","FAR","$zoning","Overlay/CCHS FAR","$(FmtOrNA $commFAR)","ratio","Overlay","--","$(if ($cchsBuildable -gt 0) { "Max buildable $($cchsBuildable.ToString('N0')) SF" } else { 'N/A' })")
      ,@("C-03","Density","$zoning","Base Max Density","$(if ($densSF -gt 0) { "1 DU / $densSF SF" } else { 'Per zoning' })","DU/SF","Base Zone","--","$(if ($maxDU -gt 0) { "floor($lotSF/$densSF) = $maxDU DU max" } else { 'Per zoning overlay' })")
      ,@("C-04","Density","$zoning","Overlay Density Cap","$(if ($commFAR -gt 0) { 'Unlimited' } else { 'N/A' })","DU","Overlay","--","")
      ,@("C-05","Height","$zoning","Base Zone Height Limit","$(FmtOrNA $baseHtLim)","ft","Base Zone","--","")
      ,@("C-06","Height","$zoning","Overlay Max Height","$(FmtOrNA $cchsMaxHt)","ft","Overlay","--","")
      ,@("C-07","Setbacks","$zoning","Front Setback","$fSb","ft","Both","--","")
      ,@("C-08","Setbacks","$zoning","Rear Setback","$rSb","ft","Both","--","")
      ,@("C-09","Setbacks","$zoning","Side Setback","$sSb","ft","Both","--","$(if ($sSb -eq 0) { 'Zero lot line; fire-rated party wall' } else { '' })")
      ,@("C-10","Commercial","$zoning","Commercial Zone Depth","$(if ($commD -gt 0) { $commD } else { 'N/A' })","ft","$zoning","--","$(if ($commD -gt 0) { 'Residential only behind commercial zone' } else { 'No commercial zone' })")
      ,@("C-11","Fees","$zoning","NEF Rate","$(if ($nefRate -gt 0) { $nefRate } else { 'N/A' })","$/SF","Both","--","$(if ($nefTotal -gt 0) { "Total: `$$($nefTotal.ToString('N0'))" } else { '' })")
      ,@("C-12","Fees","$zoning","DIF per Market Unit","$(if ($difUnit -gt 0) { "`$$($difUnit.ToString('N0'))" } else { 'N/A' })","$/unit","Both","--","Verify with jurisdiction DIF Calculator")
      ,@("C-13","Parking","State/Local","Min Parking Req","TBD","spaces","Both","--","Check transit proximity for AB 2097 exemption")
      ,@("C-14","Density Bonus","Gov. Code Sec.65915","State DB 20% Bonus","20%","bonus DU over base","State DB","--","$(if ($maxDU -gt 0) { "Base $maxDU + 20% = $sdbBonus DU" } else { '' })")
      ,@("C-15","Vesting","SB 330 / AB 130","SB 330 Vesting Window","180","days","Both","--","CA only. Permanent since AB 130 (2025)")
      ,@("C-16","Fire","CBC Table 508.4","Fire Separation (sprinklered)","1","hr","Both","--","Group M/B to R-2")
      ,@("C-17","Acoustics","CBC S1206","Wall STC (lab/field)","50/45","STC","Both","--","Airborne sound")
      ,@("C-18","Acoustics","CBC S1206","Floor-Ceiling IIC (lab/field)","50/45","IIC","Both","--","Impact sound")
      ,@("C-19","Waste","Local/SB 1383","3-Stream Containers","gray/blue/green","per unit","Both","--","Trash + recycling + organics")
      ,@("C-20","Mail","USPS PO-632","Mail Delivery Mode","STD-4C or CBU","--","Both","--","Developer pays all equipment")
    )

    $r = 2
    foreach ($row in $cRows) {
        for($c=1;$c -le 9;$c++){ Set-Cell $s2 $r $c $row[$c-1] }
        if ($r % 2 -eq 0) { Style-Alt $s2 $r 9 }
        $r++
    }
    $s2.Columns.AutoFit() | Out-Null

    # ── SHEET 3: PATHWAY COMPARISON ───────────────────────────────────
    $s3 = $wb.Worksheets.Add([System.Reflection.Missing]::Value,$s2)
    $s3.Name = "Pathway Comparison"
    $h3 = @("Factor","Base Zone (FAR $(FmtOrNA $baseFAR))","Overlay (FAR $(FmtOrNA $commFAR))","State Density Bonus","Notes")
    for($c=1;$c -le 5;$c++){ Set-Cell $s3 1 $c $h3[$c-1] }
    Style-Header $s3 1 1 1 5

    $farRatio = if ($baseFAR -gt 0 -and $commFAR -gt 0) { "$([math]::Round($commFAR / $baseFAR, 1))x more buildable" } else { "" }

    $pRows = @(
      ,@("Max FAR","$(FmtOrNA $baseFAR)","$(FmtOrNA $commFAR)","$(FmtOrNA $baseFAR) (incentive to increase)","$farRatio")
      ,@("Max Buildable SF ($($lotSF.ToString('N0')) SF lot)","$(if ($baseBuildable -gt 0) { "$($baseBuildable.ToString('N0')) SF" } else { 'N/A' })","$(if ($cchsBuildable -gt 0) { "$($cchsBuildable.ToString('N0')) SF" } else { 'N/A' })","$(if ($sdbBuildable -gt 0) { "~$($sdbBuildable.ToString('N0')) SF (20% bonus)" } else { 'N/A' })","")
      ,@("Max Density","$(if ($maxDU -gt 0) { "$maxDU DU (1/$densSF SF)" } else { 'Per zoning' })","$(if ($commFAR -gt 0) { 'Unlimited' } else { 'N/A' })","$(if ($sdbBonus -gt 0) { "$sdbBonus DU (20% bonus)" } else { 'N/A' })","")
      ,@("Max Height","$(FmtOrNA $baseHtLim) ft","$(if ($cchsMaxHt -gt 0) { "$cchsMaxHt ft" } else { 'N/A' })","$(FmtOrNA $baseHtLim) ft (unless incentive)","")
      ,@("Affordability Req","None","$(if ($affPct -gt 0) { "$([math]::Round($affPct*100))% of base DU (~$affUnits units)" } else { 'N/A' })","1 unit (5% VLI for 20% bonus)","")
      ,@("NEF Fee","$0","$(if ($nefTotal -gt 0) { "~`$$($nefTotal.ToString('N0'))" } else { 'N/A' })","$0","Waived if 100% affordable")
      ,@("Review Process","Discretionary","Ministerial 30-day","Ministerial if conforming","")
      ,@("CEQA","May apply","Exempt (ministerial)","Exempt if ministerial","")
      ,@("Stackable?","N/A","Yes - stack DB on top","Yes","")
      ,@("SB 330 Qualifies?","Yes (>=66.7% resi)","Yes (>=66.7% resi)","Yes","CA only")
    )

    $r = 2
    foreach ($row in $pRows) {
        for($c=1;$c -le 5;$c++){ Set-Cell $s3 $r $c $row[$c-1] }
        if ($r % 2 -eq 0) { Style-Alt $s3 $r 5 }
        $r++
    }
    $s3.Columns.AutoFit() | Out-Null

    # ── SHEET 4: FEE SCHEDULE ─────────────────────────────────────────
    $s4 = $wb.Worksheets.Add([System.Reflection.Missing]::Value,$s3)
    $s4.Name = "Fee Schedule"
    $h4 = @("Fee ID","Fee Name","Rate","Unit","Formula ($($lotSF.ToString('N0')) SF lot)","Est. Total","Waiver Condition","Source")
    for($c=1;$c -le 8;$c++){ Set-Cell $s4 1 $c $h4[$c-1] }
    Style-Header $s4 1 1 1 8

    $fRows = @()
    if ($nefRate -gt 0) {
        $nefHigh = [math]::Round($nefRate * 1.224, 2)
        $nefHighTotal = [math]::Round($nefHigh * $lotSF)
        $fRows += ,@("F-01","NEF","$nefRate","/SF","$nefRate x $($lotSF.ToString('N0'))","~`$$($nefTotal.ToString('N0'))","100% affordable project","--")
        $fRows += ,@("F-02","NEF (over-height)","$nefHigh","/SF","$nefHigh x $($lotSF.ToString('N0'))","~`$$($nefHighTotal.ToString('N0'))","100% affordable project","--")
    }
    if ($difUnit -gt 0) {
        $fRows += ,@("F-03","DIF per Market Unit","~`$$($difUnit.ToString('N0'))","/unit","x market-rate units","Varies","$(if ($difWaiver -gt 0) { "Affordable + units <=$difWaiver SF" } else { '--' })","--")
    }
    $fRows += ,@("F-04","SB 330 Preliminary App","Minimal","/filing","File to vest standards","~`$0-500","N/A","--")

    $r = 2
    foreach ($row in $fRows) {
        for($c=1;$c -le 8;$c++){ Set-Cell $s4 $r $c $row[$c-1] }
        if ($r % 2 -eq 0) { Style-Alt $s4 $r 8 }
        $r++
    }
    $s4.Columns.AutoFit() | Out-Null

    # ── SHEET 5: INSPECTOR CONTACTS ───────────────────────────────────
    $s5 = $wb.Worksheets.Add([System.Reflection.Missing]::Value,$s4)
    $s5.Name = "Inspectors"
    $h5 = @("Role","Contact","Phone","Notes")
    for($c=1;$c -le 4;$c++){ Set-Cell $s5 1 $c $h5[$c-1] }
    Style-Header $s5 1 1 1 4

    $r = 2
    $inspectors = $s.inspectors
    if ($inspectors -and $inspectors.Count -gt 0) {
        foreach ($ins in $inspectors) {
            $name  = if ($ins.name) { $ins.name } else { "--" }
            $val   = if ($ins.val)  { $ins.val }  else { "--" }
            # Extract phone from val if present (pattern: name (phone))
            $phone = ""
            if ($val -match '\(([0-9\-]+)\)') { $phone = $matches[1] }
            Set-Cell $s5 $r 1 $name
            Set-Cell $s5 $r 2 $val
            Set-Cell $s5 $r 3 $phone
            if ($r % 2 -eq 0) { Style-Alt $s5 $r 4 }
            $r++
        }
    } else {
        Set-Cell $s5 $r 1 "No inspectors assigned"
        $r++
    }
    $s5.Columns.AutoFit() | Out-Null

    # Reorder: Site Summary first
    $s1.Move($wb.Worksheets.Item(1))

    $wb.SaveAs($xlPath, 51)
    Write-Host "DONE: $xlPath"

} finally {
    if ($wb)  { try { $wb.Close($false) }  catch {} }
    if ($app) { try { $app.Quit() }         catch {} }
    @($wb, $app) | Where-Object { $_ } | ForEach-Object {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($_) } catch {}
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
