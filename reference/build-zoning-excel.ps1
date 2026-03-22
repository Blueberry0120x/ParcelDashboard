# Build ZoningCodeLibrary.xlsx
$xlPath = Join-Path $PSScriptRoot "ZoningCodeLibrary.xlsx"
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

try {
    $app = New-Object -ComObject Excel.Application
    $app.Visible = $false; $app.DisplayAlerts = $false
    $wb = $app.Workbooks.Add()

    # ── SHEET 1: SITE SUMMARY ─────────────────────────────────────────
    $s1 = $wb.Worksheets.Item(1); $s1.Name = "Site Summary"
    $h = @("Field","Value","Unit","Notes")
    for($c=1;$c -le 4;$c++){ Set-Cell $s1 1 $c $h[$c-1] }
    Style-Header $s1 1 1 1 4

    $rows = @(
      ,@("PROJECT")
      ,@("Project Name","Master Site Dashboard","","")
      ,@("Address","4335 Euclid Avenue, San Diego, CA 92105","","City Heights")
      ,@("APN","471-271-16-00","","Assessor Parcel Number")
      ,@("Zoning","CUPD-CU-2-4","","Commercial Urbanist Planned District")
      ,@("")
      ,@("LOT DIMENSIONS")
      ,@("Lot Width","50","ft","")
      ,@("Lot Depth","125","ft","")
      ,@("Lot SF","6250","SF","50 x 125")
      ,@("")
      ,@("BASE ZONE LIMITS")
      ,@("Base FAR","2.0","ratio","Max buildable = 12,500 SF")
      ,@("Max Height","45","ft","CUPD-CU-2-4")
      ,@("Max Density","10","DU","1 DU per 600 SF = floor(6250/600)")
      ,@("Density Factor","600","SF/DU","")
      ,@("Commercial Depth","30","ft","From front property line")
      ,@("Front Setback","10","ft","")
      ,@("Rear Setback","10","ft","")
      ,@("Side Setback","0","ft","Zero lot line; fire-rated party wall")
      ,@("")
      ,@("CCHS TIER 3 LIMITS")
      ,@("CCHS FAR","6.5","ratio","Max buildable = 40,625 SF")
      ,@("CCHS Max Height","95","ft","No fixed limit under 95 ft")
      ,@("CCHS Density","Unlimited","DU","No density cap")
      ,@("Affordability","40%","of pre-bonus base DU","~4 units at 10 DU base")
      ,@("")
      ,@("FEES (FY2026)")
      ,@("NEF Rate (<95ft)","11.78","$/SF","Waived if 100% affordable")
      ,@("NEF Total (site)","73625","$","11.78 x 6,250 SF")
      ,@("NEF Rate (>95ft)","14.42","$/SF","")
      ,@("DIF per Market Unit","15000","$","Estimate. Verify with DIF Calculator.")
      ,@("DIF Waiver Threshold","500","SF","Units <=500 SF: DIF waived (CCHS)")
      ,@("C&D Deposit (Resi)","0.40","$/SF","Reg C-010-25; 65% diversion req.")
      ,@("C&D Deposit (Comm)","0.20","$/SF","")
      ,@("Prelim Review Single","1481","$","IB-513 / DS-375")
      ,@("Prelim Review Multiple","12106","$","Assigns DPM")
      ,@("")
      ,@("SB 330")
      ,@("Min Residential %","66.7","%","Project must be >=66.7% resi by SF")
      ,@("Vesting Window","180","days","Standards frozen from filing date")
      ,@("Construction Start","2.5","years","From final approval. AB 130 permanent.")
    )

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
      ,@("C-01","FAR","SDMC Sec.143.1010(d) Table 143-10A","Base Zone FAR","2.0","ratio","Base Zone","SDMC-Ch14-Art3-Div10-CCHS.pdf","Max buildable 12,500 SF on 6,250 SF lot")
      ,@("C-02","FAR","SDMC Sec.143.1010(d) Table 143-10A","CCHS Tier 3 FAR","6.5","ratio","CCHS","SDMC-Ch14-Art3-Div10-CCHS.pdf","Max buildable 40,625 SF")
      ,@("C-03","Density","SDMC","Base Max Density","1 DU / 600 SF","DU/SF","Base Zone","SDMC-Ch15-Art5-Div2-CUPD.pdf","floor(6250/600) = 10 DU max")
      ,@("C-04","Density","SDMC Sec.143.1010","CCHS Density Cap","Unlimited","DU","CCHS","SDMC-Ch14-Art3-Div10-CCHS.pdf","No density cap")
      ,@("C-05","Height","SDMC / CUPD-CU-2-4","Base Zone Height Limit","45","ft","Base Zone","SDMC-Ch15-Art5-Div2-CUPD.pdf","")
      ,@("C-06","Height","SDMC Sec.143.1010","CCHS Max Height","95","ft","CCHS","SDMC-Ch14-Art3-Div10-CCHS.pdf","No fixed limit UNDER 95 ft")
      ,@("C-07","Setbacks","SDMC Sec.155.0240","Front Setback","10","ft","Both","SDMC-Ch15-Art5-Div2-CUPD.pdf","From Euclid Ave property line")
      ,@("C-08","Setbacks","SDMC Sec.155.0240","Rear Setback","10","ft","Both","SDMC-Ch15-Art5-Div2-CUPD.pdf","")
      ,@("C-09","Setbacks","SDMC Sec.155.0240","Side Setback (zero lot)","0","ft","Both","SDMC-Ch15-Art5-Div2-CUPD.pdf","Fire-rated party wall; no windows")
      ,@("C-10","Setbacks","SDMC Sec.155.0240","Side Setback (with windows)","10","ft","Both","SDMC-Ch15-Art5-Div2-CUPD.pdf","Allows windows/balconies")
      ,@("C-11","Commercial Use","SDMC Sec.155.0240 Table 155-02D","Front Commercial Zone Depth","30","ft","CUPD-CU-2-4","SDMC-Ch15-Art5-Div2-CUPD.pdf","Residential only behind 30 ft from front PL")
      ,@("C-12","Commercial Use","SDMC Sec.155.0240","Actual Commercial Bldg Depth","20","ft","CUPD-CU-2-4","SDMC-Ch15-Art5-Div2-CUPD.pdf","30 ft zone minus 10 ft setback")
      ,@("C-13","Commercial Use","CUPD-CU-2-4","Commercial Operating Hours","6 AM - midnight","hrs","CUPD-CU-2-4","SDMC-Ch15-Art5-Div2-CUPD.pdf","Hard zoning restriction")
      ,@("C-14","Affordability","SDMC Sec.143.1010","CCHS Affordability Req","40%","of pre-bonus base DU","CCHS","SDMC-Ch14-Art3-Div10-CCHS.pdf","~4 units at 10 DU base")
      ,@("C-15","Affordability","SDMC Sec.143.1010","AMI Tiers","15%<=50% / 10%<=60% / 15%<=120%","AMI","CCHS","SDMC-Ch14-Art3-Div10-CCHS.pdf","Deed-restricted per tier")
      ,@("C-16","Fees - NEF","SDMC / Resolution R-313282","NEF Rate FY2026 (<95ft)","11.78","$/SF","CCHS","SD-FY2026-FeeSchedule.pdf","Annual auto-adjustment. Waived 100% affordable.")
      ,@("C-17","Fees - NEF","SDMC","NEF Rate FY2026 (>95ft)","14.42","$/SF","CCHS","SD-FY2026-FeeSchedule.pdf","Higher tier over-height buildings")
      ,@("C-18","Fees - DIF","SDMC Sec.143.1010(i)(3)","DIF Waiver Threshold (CCHS)","500","SF","CCHS","SDMC-Ch14-Art3-Div10-CCHS.pdf","Units <=500 SF: DIF fully waived")
      ,@("C-19","Fees - DIF","SDMC","DIF per Market Unit (est.)","15000","$/unit","Both","SD-FY2026-FeeSchedule.pdf","Verify with City DIF Calculator + APN")
      ,@("C-20","Fees - DIF","SDMC Sec.142.0640(b)(1)(a) / SB 13","ADU DIF Exemption Threshold","750","SF - ADU ONLY","ADU only","--","NOT applicable to standard multifamily")
      ,@("C-21","Parking","Gov. Code Sec.65863.2 / AB 2097","Min Parking Req (TPA)","0","spaces","Both","HCD-AB2097-TechnicalAdvisory.pdf","Within 1/2 mile major transit stop")
      ,@("C-22","Parking","SDMC (TPA)","Local Parking Elimination","0","spaces","Both","--","San Diego eliminated parking in TPA")
      ,@("C-23","Density Bonus","Gov. Code Sec.65915","State DB 20% Bonus","20%","bonus DU over base","State DB","--","1 affordable unit (5% VLI) unlocks 20%")
      ,@("C-24","Vesting","Gov. Code Sec.65589.5 / AB 130","SB 330 Vesting Window","180","days","Both","--","Permanent law since AB 130 (2025)")
      ,@("C-25","Vesting","SB 330","SB 330 Min Residential %","66.7","%","Both","--","Project >=66.7% residential by SF")
      ,@("C-26","Fire","CBC Table 508.4","Fire Separation (sprinklered)","1","hr","Both","--","Group M/B to R-2")
      ,@("C-27","Fire","NFPA 13","Sprinkler Requirement","Entire building","--","Both","--","Mandatory Group R. PAYWALLED.")
      ,@("C-28","Acoustics","CBC S1206","Wall STC (lab)","50","STC","Both","--","Airborne sound")
      ,@("C-29","Acoustics","CBC S1206","Wall STC (field)","45","STC","Both","--","")
      ,@("C-30","Acoustics","CBC S1206","Floor-Ceiling IIC (lab)","50","IIC","Both","--","Impact sound")
      ,@("C-31","Acoustics","CBC S1206","Floor-Ceiling IIC (field)","45","IIC","Both","--","")
      ,@("C-32","Acoustics","CBC S1206","Corridor Doors STC","26","STC","Both","--","With acoustic seals")
      ,@("C-33","Acoustics","CBC S1206","Non-Resi STC","40","STC","Both","--","55-60 if restaurant next to residential")
      ,@("C-34","Waste","SDMC Sec.142.0801-0830","Enclosure Size","120-180","SF","Both","SDMC-Ch14-Art2-Div8-WasteEnclosure.pdf","Table 142-08B + 08C")
      ,@("C-35","Waste","SDMC Sec.142.0825","Enclosure Signage","Required","--","Both","SDMC-Ch14-Art2-Div8-WasteEnclosure.pdf","At access point")
      ,@("C-36","Waste","SB 1383","3-Stream Containers","gray/blue/green","per unit","Both","--","Trash + recycling + organics")
      ,@("C-37","Waste","Reg C-010-25","City Refuse Eligible","No","--","Both","--","Mixed-use >4 units: private hauler only")
      ,@("C-38","Waste","SDMC","Truck Access Width","16","ft clear / 14 ft vertical","Both","SDMC-Ch14-Art2-Div8-WasteEnclosure.pdf","60,000 lb trucks")
      ,@("C-39","Waste","City of SD","C&D Deposit (Resi)","0.40","$/SF","Both","--","65% diversion. Reg C-010-25")
      ,@("C-40","Waste","City of SD","C&D Deposit (Comm)","0.20","$/SF","Both","--","")
      ,@("C-41","Mail","USPS PO-632","Mail Delivery Mode","STD-4C or CBU","--","Both","--","Developer pays all equipment")
      ,@("C-42","Mail","USPS PO-632","Parcel Lockers","1 per 5 compartments","--","Both","--","")
      ,@("C-43","Mail","ADA Standards","ADA Mail Area Clear Floor","30x48 in / 60 in turn","--","Both","--","Locks: 15-67 in AFF")
      ,@("C-44","SB 9","Gov. Code Sec.65852.21","SB 9 Applicability","NOT applicable","--","N/A","SD-IB409-SB9.pdf","CUPD-CU-2-4 is mixed-use; SB 9 = single-family RS only")
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
    $h3 = @("Factor","Base Zone (FAR 2.0)","CCHS Tier 3 (FAR 6.5)","State Density Bonus","Notes")
    for($c=1;$c -le 5;$c++){ Set-Cell $s3 1 $c $h3[$c-1] }
    Style-Header $s3 1 1 1 5

    $pRows = @(
      ,@("Max FAR","2.0","6.5","2.0 (incentive to increase)","CCHS = 3.25x more buildable")
      ,@("Max Buildable SF (6,250 SF lot)","12,500 SF","40,625 SF","~15,000 SF (20% bonus)","")
      ,@("Max Density","10 DU (1/600 SF)","Unlimited","12 DU (20% bonus)","")
      ,@("Max Height","45 ft","No limit <95 ft","45 ft (unless incentive)","")
      ,@("Affordability Req","None","40% of base DU (~4 units)","1 unit (5% VLI for 20% bonus)","CCHS: deeper obligation")
      ,@("NEF Fee","$0","~$73,625 ($11.78/SF)","$0","Waived if 100% affordable")
      ,@("DIF Waiver","No","Yes: affordable + units <=500 SF","No general waiver","")
      ,@("Parking","0 (TPA + AB 2097)","0 (TPA + AB 2097)","Reduced 0.5/unit near transit","")
      ,@("Review Process","Discretionary","Ministerial 30-day","Ministerial if conforming","CCHS = fastest")
      ,@("CEQA","May apply","Exempt (ministerial)","Exempt if ministerial","")
      ,@("Stackable?","N/A","Yes - stack Density Bonus on top","Yes","")
      ,@("Best for","<=10 units, no affordability","12+ units, maximize density","Minimize affordability obligation","")
      ,@("SB 330 Qualifies?","Yes (>=66.7% resi)","Yes (>=66.7% resi)","Yes","")
      ,@("Code Reference","SDMC Ch.15","SDMC Sec.143.1010","Gov. Code Sec.65915","")
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
    $h4 = @("Fee ID","Fee Name","Rate","Unit","Formula (6,250 SF lot)","Est. Total","Waiver Condition","Source")
    for($c=1;$c -le 8;$c++){ Set-Cell $s4 1 $c $h4[$c-1] }
    Style-Header $s4 1 1 1 8

    $fRows = @(
      ,@("F-01","NEF (<95 ft)","$11.78","/SF","11.78 x 6,250","~$73,625","100% affordable project","SD-FY2026-FeeSchedule.pdf")
      ,@("F-02","NEF (>95 ft)","$14.42","/SF","14.42 x 6,250","~$90,125","100% affordable project","SD-FY2026-FeeSchedule.pdf")
      ,@("F-03","DIF per Market Unit (est.)","~$15,000","/unit","x market-rate units","Varies","Affordable units + <=500 SF (CCHS)","SD-FY2026-FeeSchedule.pdf")
      ,@("F-04","Prelim Review - Single","$1,481","flat","1 discipline, 10 questions","$1,481","N/A","DSD IB-513 / DS-375")
      ,@("F-05","Prelim Review - Multiple","$12,106","flat","All disciplines, assigns DPM","$12,106","N/A","DSD IB-513 / DS-375")
      ,@("F-06","CCHS Now Review","$0","flat","Mandatory first step CCHS","$0","N/A","SDMC Sec.143.1010")
      ,@("F-07","NUP","~$3,000-$5,000","flat","Eating/drinking establishments","~$4,000","Not needed: retail/office","DSD Process 2")
      ,@("F-08","CUP","~$10,000-$20,000+","flat","Alcohol sales","~$15,000","Not needed: no alcohol","DSD Process 3")
      ,@("F-09","C&D Deposit (Resi)","$0.40","/SF","0.40 x residential SF","Varies","65% diversion & return","Reg C-010-25")
      ,@("F-10","C&D Deposit (Comm)","$0.20","/SF","0.20 x commercial SF","Varies","65% diversion & return","Reg C-010-25")
      ,@("F-11","SB 330 Preliminary App","Minimal","/filing","File to vest standards","~$0-500","N/A","Gov. Code Sec.65589.5")
    )

    $r = 2
    foreach ($row in $fRows) {
        for($c=1;$c -le 8;$c++){ Set-Cell $s4 $r $c $row[$c-1] }
        if ($r % 2 -eq 0) { Style-Alt $s4 $r 8 }
        $r++
    }
    $s4.Columns.AutoFit() | Out-Null

    # ── SHEET 5: CODE REFERENCES INDEX ───────────────────────────────
    $s5 = $wb.Worksheets.Add([System.Reflection.Missing]::Value,$s4)
    $s5.Name = "Code References"
    $h5 = @("Ref ID","Law / Code","Section","Topic","PDF on Disk","URL")
    for($c=1;$c -le 6;$c++){ Set-Cell $s5 1 $c $h5[$c-1] }
    Style-Header $s5 1 1 1 6

    $rRows = @(
      ,@("R-01","SDMC Ch.14 Art.3 Div.10","Sec.143.1010","CCHS - FAR tiers, affordability, DIF waiver, NEF","SDMC-Ch14-Art3-Div10-CCHS.pdf","docs.sandiego.gov/municode/MuniCodeChapter14/Ch14Art03Division10.pdf")
      ,@("R-02","SDMC Ch.15 Art.5 Div.2","Sec.155.0240 Tables 155-02C/D","CUPD-CU-2-4 zoning, commercial frontage, setbacks","SDMC-Ch15-Art5-Div2-CUPD.pdf","docs.sandiego.gov/municode/MuniCodeChapter15/Ch15Art05Division02.pdf")
      ,@("R-03","SDMC Ch.14 Art.2 Div.8","Sec.142.0801-0830","Waste enclosure standards, sizing, signage","SDMC-Ch14-Art2-Div8-WasteEnclosure.pdf","docs.sandiego.gov/municode/MuniCodeChapter14/Ch14Art02Division08.pdf")
      ,@("R-04","SDMC Ch.14 Art.3 Div.10","Sec.143.0720","State Density Bonus implementation","SDMC-Ch14-Art3-Div10-CCHS.pdf","")
      ,@("R-05","SDMC Ch.14 Art.2 Div.6","Sec.142.0640(b)(1)(a)","ADU DIF exemption 750 SF (NOT this project)","--","")
      ,@("R-06","City of San Diego","FY2026 Fee Schedule","NEF rates, DIF schedule, permit fees","SD-FY2026-FeeSchedule.pdf","sandiego.gov/sites/default/files/feeschedule.pdf")
      ,@("R-07","Commercial Zoning","CUPD background","Commercial zoning overview","SD-commercialzoning.pdf","")
      ,@("R-08","CA Gov. Code / SB 330 + AB 130","Sec.65589.5","Housing Crisis Act - vesting. AB 130 made permanent 2025.","--","")
      ,@("R-09","CA Gov. Code / AB 2097","Sec.65863.2","Zero parking within 1/2 mile transit stop","HCD-AB2097-TechnicalAdvisory.pdf","hcd.ca.gov/sites/default/files/docs/policy-and-research/ab-2097-ta.pdf")
      ,@("R-10","CA Gov. Code / SB 9","Sec.65852.21","Multi-unit on single-family lots (NOT this site)","SD-IB409-SB9.pdf","sandiego.gov/.../information-bulletins/409")
      ,@("R-11","CA Gov. Code","Sec.65915","State Density Bonus Law","--","")
      ,@("R-12","SB 1383 / CalRecycle","Title 14 CCR Div.7 Ch.12 Art.2","Organic waste 3-stream containers","--","calrecycle.ca.gov/organics/slcp/")
      ,@("R-13","CBC 2022","Table 508.4","Mixed-occupancy fire separation","--","PAYWALLED - ICC.org")
      ,@("R-14","CBC 2022","Section 1206","Acoustic requirements STC/IIC","--","PAYWALLED - ICC.org")
      ,@("R-15","NFPA 13","Standard for Sprinklers","Group R sprinkler system","--","PAYWALLED - NFPA.org")
      ,@("R-16","USPS PO-632","Centralized Mail Receptacle","Mailbox equipment, parcel lockers, ADA","--","about.usps.com/handbooks/po632/")
      ,@("R-17","City of SD Regulation","C-010-25","Private refuse hauler req (>4 units mixed-use)","--","Verify with DSD Waste Management")
      ,@("R-18","DSD Information Bulletin","IB-513 / DS-375","Preliminary Review application forms","--","sandiego.gov/.../information-bulletins/513")
      ,@("R-19","DSD Information Bulletin","IB-409","SB 9 guidance for single-family lots","SD-IB409-SB9.pdf","sandiego.gov/.../information-bulletins/409")
    )

    $r = 2
    foreach ($row in $rRows) {
        for($c=1;$c -le 6;$c++){ Set-Cell $s5 $r $c $row[$c-1] }
        if ($r % 2 -eq 0) { Style-Alt $s5 $r 6 }
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

