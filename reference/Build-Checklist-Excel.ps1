# Build Site-Data-Checklist.xlsx
$xlPath = Join-Path $PSScriptRoot 'Site-Data-Checklist.xlsx'
$app = $null; $wb = $null
try {
    $app = New-Object -ComObject Excel.Application
    $app.Visible = $false
    $app.DisplayAlerts = $false
    $wb = $app.Workbooks.Add()
    $ws = $wb.Worksheets.Item(1)
    $ws.Name = 'Site Checklist'

    $ws.Columns.Item(1).ColumnWidth = 26
    $ws.Columns.Item(2).ColumnWidth = 40
    $ws.Columns.Item(3).ColumnWidth = 6
    $ws.Columns.Item(4).ColumnWidth = 42
    $ws.Columns.Item(5).ColumnWidth = 58

    function Set-Cell($r,$c,$v,$bold=$false,$bg=0,$sz=10,$wrap=$false,$fg=0) {
        $cell = $ws.Cells.Item($r,$c)
        $cell.Value2 = $v
        $cell.Font.Bold = $bold
        $cell.Font.Size = $sz
        if ($bg -ne 0) { $cell.Interior.Color = $bg }
        if ($fg -ne 0) { $cell.Font.Color = $fg }
        if ($wrap) { $cell.WrapText = $true }
    }

    $cHeader  = 0x1F3864
    $cSection = 0x2E4057
    $cAlt     = 0xF2F2F2
    $cWhite   = 0xFFFFFF
    $cGold    = 0xFFD966
    $cFontW   = 0xFFFFFF

    # Title
    $ws.Range('A1:E1').Merge() | Out-Null
    Set-Cell 1 1 'PROJECTBOOK-PLANNER - SITE DATA COLLECTION CHECKLIST' $true $cHeader 13 $false $cFontW
    $ws.Rows.Item(1).RowHeight = 28

    # Column headers
    $hdrs = @('SECTION','FIELD / DATA POINT','DONE','VALUE COLLECTED','SOURCE / WHERE TO GET IT')
    for ($c=1; $c -le 5; $c++) {
        Set-Cell 2 $c $hdrs[$c-1] $true 0x4472C4 10 $false $cFontW
    }
    $ws.Rows.Item(2).RowHeight = 18

    $rows = @(
        @('A. Parcel Identity','Full street address','County Assessor / ParcelQuest'),
        @('A. Parcel Identity','APN (all parcels if combined)','County Assessor / ParcelQuest'),
        @('A. Parcel Identity','Legal description (full)','Deed or Assessor record'),
        @('A. Parcel Identity','Year built (existing structure)','Assessor record — or Vacant if raw land'),
        @('A. Parcel Identity','Occupancy group (existing building)','Building permit history or existing plans'),

        @('B. Lot Dimensions','Lot width (ft) - front face','Assessor record or GIS parcel data'),
        @('B. Lot Dimensions','Lot depth (ft)','Assessor record or GIS parcel data'),
        @('B. Lot Dimensions','Lot SF (use assessor value - not W x D)','Assessor record'),
        @('B. Lot Dimensions','Lot acres (lotSF / 43560)','Calculated'),
        @('B. Lot Dimensions','Irregular lot? Note all edge lengths','GIS parcel polygon'),

        @('C. Zoning Standards','Zone designation (exact code)','City zoning map / ZIMS zoning inquiry'),
        @('C. Zoning Standards','Base FAR','Municipal code - zoning district standards table'),
        @('C. Zoning Standards','Commercial FAR (mixed-use zone)','Municipal code - mixed-use or CCHS bonus table'),
        @('C. Zoning Standards','Max height base (ft)','Municipal code - height limits by zone'),
        @('C. Zoning Standards','Max height with bonus (ft)','CCHS / density bonus provisions'),
        @('C. Zoning Standards','CCHS max height cap (ft)','San Diego CCHS program - Tier 1/2/3 limits'),
        @('C. Zoning Standards','Front setback (ft)','Municipal code - setback standards for zone'),
        @('C. Zoning Standards','Rear setback (ft)','Municipal code - setback standards for zone'),
        @('C. Zoning Standards','Side setback (ft)','Municipal code - setback standards for zone'),
        @('C. Zoning Standards','Density: SF of lot per unit (e.g. 600)','Municipal code - e.g. 1 unit per 600 SF'),
        @('C. Zoning Standards','Commercial frontage depth (ft)','CUPD/mixed-use code - min ground floor commercial depth'),

        @('D. Planning Overlays','Community plan area name','City General Plan Land Use Map or zoning inquiry'),
        @('D. Planning Overlays','Land use designation','Community plan document'),
        @('D. Planning Overlays','CCHS Housing Solutions - tier (1/2/3 or N/A)','sandiego.gov/planning - CCHS map'),
        @('D. Planning Overlays','CCHS bonus FAR','CCHS tier table - Tier 3 = 6.5 FAR'),
        @('D. Planning Overlays','TPA (Transit Priority Area) - Yes/No','SANDAG GIS or HCD TPA map'),
        @('D. Planning Overlays','Parking Standards (PSTPA) - Yes/No','TPA = Yes then PSTPA applies (0 parking required)'),
        @('D. Planning Overlays','Mobility Choices zone','SD Municipal Code Appendix A Figure A-1'),
        @('D. Planning Overlays','Transit Area Overlay - Yes/No','ZIMS zoning inquiry - shown as TA overlay'),
        @('D. Planning Overlays','Airport Influence Area - Yes/No','SDIA Land Use Compatibility Plan PDF'),
        @('D. Planning Overlays','Coastal Overlay - Yes/No','ZIMS or San Diego Coastal Zone map'),
        @('D. Planning Overlays','Very High Fire Hazard Zone - Yes/No','Cal Fire FHSZ viewer: osfm.fire.ca.gov/fhsz-maps'),
        @('D. Planning Overlays','Fault / Alquist-Priolo Zone - Yes/No','CGS AP Zone map: maps.conservation.ca.gov/cgs/ap'),

        @('E. Fees','NEF rate per SF','City DSD Fee Schedule PDF - search NEF'),
        @('E. Fees','Affordability target % (density bonus)','State Gov Code 65915 - typically 10-24%'),
        @('E. Fees','DIF per unit (Development Impact Fee)','City DSD DIF schedule - residential category'),
        @('E. Fees','DIF waiver SF threshold','City affordable housing DIF waiver policy'),

        @('F. Project Info','Project type','e.g. 3-Story Townhome / Mixed-Use Residential'),
        @('F. Project Info','Architect / firm name','Project team'),
        @('F. Project Info','Scope of work (full narrative)','Write: what is demolished / built / program / units'),
        @('F. Project Info','Notes (zoning conditions, combined lots)','Any unusual conditions: combined APNs, corner triangle, easements'),
        @('F. Project Info','Occupancy group (proposed)','Based on project type: R-2 multifamily, B commercial'),

        @('G. Inspector Contacts','Combination inspector - name + phone','City permit office / DSD staff directory - Inspection Services'),
        @('G. Inspector Contacts','Structural inspector - name + phone','City permit office / DSD staff directory'),
        @('G. Inspector Contacts','Electrical inspector - name + phone','City permit office / DSD staff directory'),
        @('G. Inspector Contacts','Mechanical inspector - name + phone','City permit office / DSD staff directory'),
        @('G. Inspector Contacts','Grading / Civil inspector - name + phone','City permit office / DSD staff directory'),

        @('H. Map Setup','Parcel centroid lat/lng','Google Maps - navigate to lot - right-click center - copy coordinates'),
        @('H. Map Setup','Parcel polygon vertices (irregular lots only)','County GIS portal - parcel detail - export vertex lat/lng'),
        @('H. Map Setup','Initial map rotation (degrees)','Estimate from aerial: degrees lot north is off screen-north'),
        @('H. Map Setup','Corner visibility triangle - corner + size (ft)','City code for corner lots - typically 25ft legs'),
        @('H. Map Setup','Density bonus applicable - Yes/No','Any CA residential project with affordable units = likely Yes')
    )

    $r = 3
    $lastSection = ''
    foreach ($row in $rows) {
        $section = $row[0]
        if ($section -ne $lastSection) {
            $ws.Range("A${r}:E${r}").Merge() | Out-Null
            Set-Cell $r 1 $section $true $cSection 10 $false $cFontW
            $ws.Rows.Item($r).RowHeight = 17
            $r++
            $lastSection = $section
        }
        $bg = if (($r % 2) -eq 0) { $cWhite } else { $cAlt }
        Set-Cell $r 1 '' $false $bg
        Set-Cell $r 2 $row[1] $false $bg 9 $true
        Set-Cell $r 3 '' $false $cGold
        Set-Cell $r 4 '' $false $bg
        Set-Cell $r 5 $row[2] $false $bg 9 $true
        $ws.Rows.Item($r).RowHeight = 16
        $r++
    }

    # Borders
    $ws.Range("A2:E$($r-1)").Borders.LineStyle = 1
    $ws.Range("A2:E$($r-1)").Borders.Weight = 2

    # Freeze top 2 rows
    $ws.Application.ActiveWindow.SplitRow = 2
    $ws.Application.ActiveWindow.FreezePanes = $true

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
