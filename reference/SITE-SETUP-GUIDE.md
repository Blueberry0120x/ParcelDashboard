# ProjectBook-Planner — Site Setup Guide
# How to Recreate a Site Dashboard from Scratch

> This document answers: "What do I need, where do I get it, and how does it become the dashboard?"
> For technical engine internals see `ARCHITECTURE.md`.

---

## TABLE OF CONTENTS

1. [What You Are Building](#1-what-you-are-building)
2. [Tools & Prerequisites](#2-tools--prerequisites)
3. [Source Documents Required Per Site](#3-source-documents-required-per-site)
4. [Data Collection Checklist](#4-data-collection-checklist)
5. [Site JSON — Field-by-Field Reference](#5-site-json--field-by-field-reference)
6. [How Each Field Drives the Dashboard](#6-how-each-field-drives-the-dashboard)
7. [Adding a New Site — Step-by-Step](#7-adding-a-new-site--step-by-step)
8. [Parcel Polygon Coordinates](#8-parcel-polygon-coordinates)
9. [Inspector Contacts — Where to Find](#9-inspector-contacts--where-to-find)
10. [Planning & Transit Overlays — Where to Find](#10-planning--transit-overlays--where-to-find)
11. [Fee Schedule Fields — Where to Find](#11-fee-schedule-fields--where-to-find)
12. [Workflow: Day-to-Day Use](#12-workflow-day-to-day-use)
13. [Site JSON Template (blank)](#13-site-json-template-blank)

---

## 1. What You Are Building

For each parcel you get:

| Output | What it shows |
|--------|---------------|
| `InteractiveMap.html` | Aerial map with draggable building footprints, setback overlay, chain dimensions, vehicle turn templates, elevation sampling |
| `PreApp_Checklist.html` | Pre-application checklist: State Density Bonus calculator, pathway selector, fee estimates, contact matrix |

Both files are self-contained HTML. One JSON config file per site drives all the dynamic content.

---

## 2. Tools & Prerequisites

| Tool | Purpose | Required? |
|------|---------|-----------|
| PowerShell 5.1+ (Windows) | Build + dev server | YES |
| Git | Version control | YES |
| Browser (Chrome/Edge recommended) | View the output | YES |
| ParcelQuest (`assr.parcelquest.com`) | Parcel data, legal description, lot dimensions | YES |
| City/County GIS portal | Parcel polygon coordinates, zoning layer | YES |
| City zoning code (PDF or web) | FAR, setbacks, height limits, density | YES |
| Community Plan document (PDF) | Land use designation, planning area name | YES |
| City fee schedule (PDF or Excel) | NEF, DIF, affordability targets | YES |
| City permit office / directory | Inspector contacts (name + phone) | YES |
| SanDag GIS / county GIS | TPA status, overlay zones, fire hazard zone | YES (CA sites) |

---

## 3. Source Documents Required Per Site

### For a California site (San Diego):

| Document | Where to get it | Fields extracted |
|----------|----------------|-----------------|
| County Assessor record | `assr.parcelquest.com` → search APN | address, APN, legal description, year built, lot SF |
| Zoning map + code | San Diego Development Services: `sandiego.gov/development-services` → ZIMS or Zoning Inquiry | zoning, FAR, setbacks, height, density |
| Community Plan | San Diego Planning Dept PDF archive | community plan area, land use designation |
| CCHS Housing Solutions map | `sandiego.gov/planning/programs/housing/climate-solutions` | CCHS tier, bonus FAR |
| TPA map | SANDAG Active Transportation Atlas or SanDag GIS | TPA yes/no, parking elimination |
| Mobility Choices map | San Diego Municipal Code Chapter 14 Appendix A | mobility zone |
| Transit Area Overlay | ZIMS zoning lookup | overlay yes/no |
| Fire Hazard Zone | Cal Fire FHSZ viewer or city zoning | very high / high / no |
| Airport Influence Area | SDIA Land Use Plan PDF | yes/no, zone letter |
| Coastal Overlay | San Diego CEIS or zoning map | yes/no |
| Fault Zone | CGS Alquist-Priolo map viewer | yes/no |
| Fee Schedule | San Diego DSD Fee Schedule (annual PDF) | NEF rate/SF, DIF/unit |
| Inspector contacts | San Diego DSD staff directory or permit office call | name, phone by discipline |

### For a California site (Orange County / Garden Grove):

| Document | Where to get it | Fields extracted |
|----------|----------------|-----------------|
| County Assessor | `ocgov.com/assessor` | APN, lot data |
| City zoning code | Garden Grove Municipal Code (Municode.com) | R-3 standards, setbacks, height, density |
| General Plan | Garden Grove General Plan Land Use Element | land use designation |
| Fee schedule | Garden Grove Building & Safety fee schedule | permit fees |
| Inspector contacts | Garden Grove Building & Safety dept | name, phone |

### For a Washington site (Burien / King County):

| Document | Where to get it | Fields extracted |
|----------|----------------|-----------------|
| County Assessor | `kingcounty.gov/assessor` | APN, lot data |
| City zoning code | Burien Municipal Code (Municode.com) | zoning, setbacks, FAR, height |
| King County GIS | `gismaps.kingcounty.gov` | parcel polygon, zoning layer |
| Fee schedule | Burien permit office | permit fees |

---

## 4. Data Collection Checklist

Work through this list for every new site before touching the JSON.

### A. Parcel Identity
- [ ] Full street address (primary + any secondary units/ranges)
- [ ] APN (one or multiple if lots are combined)
- [ ] Legal description (from deed or assessor record)
- [ ] Year built (existing structure, or "Vacant" if raw land)
- [ ] Occupancy group (existing building: A, B, R-2, R-3, etc.)

### B. Lot Dimensions
- [ ] Lot width (front face, in feet)
- [ ] Lot depth (in feet)
- [ ] Lot SF (from assessor — use this, not W×D, for irregular lots)
- [ ] Lot acres (lotSF / 43560)
- [ ] Are there multiple widths or depths? (irregular polygon — note all edges)

### C. Zoning Standards
- [ ] Zone designation (exact code: R-3, CUPD-CU-2-4, etc.)
- [ ] Base FAR (if applicable — 0 for pure residential R-3)
- [ ] Commercial FAR (if mixed-use zone)
- [ ] Max height (base height limit, in feet)
- [ ] CCHS / bonus height cap (if applicable)
- [ ] Front setback (feet)
- [ ] Rear setback (feet)
- [ ] Side setback (feet) — one value if both sides equal
- [ ] Density (SF of lot per unit, e.g. 600 SF/unit, OR units per acre)
- [ ] Commercial frontage depth (min commercial ground floor depth, if applicable)

### D. Planning Overlays
- [ ] Community plan area name
- [ ] Land use designation (from community/general plan map)
- [ ] CCHS (Climate-Conscious Housing Solutions) — tier 1/2/3 or N/A
- [ ] TPA (Transit Priority Area) — yes/no
- [ ] Parking Standards (PSTPA) — yes/no, requirements
- [ ] Mobility Choices program — zone number or N/A
- [ ] Transit Area Overlay — yes/no
- [ ] Airport Influence Area — yes/no (and zone if yes)
- [ ] Coastal Overlay — yes/no
- [ ] Very High Fire Hazard Zone — yes/no
- [ ] Fault/Alquist-Priolo Zone — yes/no

### E. Fees
- [ ] NEF rate per SF (Neighborhood Enhancement Fee or equivalent)
- [ ] Affordability percentage target (e.g. 40% for density bonus)
- [ ] DIF per unit (Development Impact Fee)
- [ ] DIF waiver SF threshold (units below this SF get waiver)

### F. Project Info
- [ ] Project type (e.g. "3-Story Townhome", "Mixed-Use Residential")
- [ ] Architect / firm name
- [ ] Scope of work (full description of what is being built)
- [ ] Notes (any unusual zoning conditions, combined lots, corner conditions)

### G. Inspector Contacts
- [ ] Combination inspector: name + phone
- [ ] Structural inspector: name + phone
- [ ] Electrical inspector: name + phone
- [ ] Mechanical inspector: name + phone
- [ ] Grading / Civil inspector: name + phone

### H. Map Setup
- [ ] Parcel centroid lat/lng (from Google Maps or GIS portal — right-click → "What's here")
- [ ] Parcel polygon vertices (lat/lng array, clockwise from NW corner) — from GIS portal
- [ ] Initial map rotation (degrees, so lot appears aligned to screen)
- [ ] Corner visibility triangle — yes/no, which corner (NW/NE/SW/SE), size in feet
- [ ] Density bonus applicable — yes/no

---

## 5. Site JSON — Field-by-Field Reference

File location: `data/sites/{state}-{number}_{street}.json`
Example: `data/sites/ca-4335_Euclid.json`

The file has two top-level blocks:
- `"site"` — **static identity + rules** — edit this manually or via the editor
- `"saved"` — **session state** — written by the app (buildings, rotation, etc.) — do not edit manually

### `site` block — all fields

```json
{
  "siteId": "CA-EUCLID",           // Unique ID — used for site switching. Format: {STATE}-{NAME}
  "address": "4335 Euclid Ave...", // Full street address shown in header + PROJECT INFORMATION
  "apn": "471-271-16-00",          // APN shown in PROJECT INFORMATION
  "legalDescription": "Lot 16...", // Full legal description — PROJECT INFORMATION row
  "yearBuilt": "1952",             // Existing structure year — PROJECT INFORMATION row
  "occupancyGroup": "B / R-2",     // Building occupancy code — PROJECT INFORMATION row
  "zoning": "CUPD-CU-2-4",        // Zone code — shown in banner + PROJECT INFORMATION
  "cadZone": "CA_VI",              // CAD coordinate system zone — drives LISP export
                                   //   Options: CA_I through CA_VI, WA_N, WA_S
  "lotWidth": 50,                  // Lot width in feet — drives map polygon width
  "lotDepth": 125,                 // Lot depth in feet — drives map polygon height
  "lotSF": 6250,                   // Lot area SF — used for FAR, density calcs
  "commercialDepth": 30,           // Min ground floor commercial depth (ft) — CUPD only, 0 for residential
  "baseFAR": 2.0,                  // Base floor area ratio — ZONING PARAMETERS
  "commFAR": 6.5,                  // Commercial/bonus FAR (CCHS, mixed-use) — ZONING PARAMETERS
  "maxHeight": 50,                 // Max height in feet (with bonus) — ZONING PARAMETERS
  "baseHeightLimit": 45,           // Base height without bonus
  "cchsMaxHeight": 95,             // CCHS max height (Tier 3 climate bonus) — 0 if N/A
  "frontSetback": 10,              // Front setback in feet — drives setback overlay on map
  "rearSetback": 10,               // Rear setback in feet
  "sideSetback": 0,                // Side setback in feet (one value, applied both sides)
  "densityPerSF": 600,             // SF of lot per dwelling unit (600 = 1 unit per 600 SF)
                                   //   Set 0 if density is not SF-based
  "nefRatePerSF": 11.78,           // NEF or equivalent fee per SF — checklist fee calc
  "affordabilityPct": 0.4,         // Affordability target as decimal (0.4 = 40%)
  "difPerUnit": 15000,             // Development Impact Fee per unit — checklist
  "difWaiverSF": 500,              // Units ≤ this SF are DIF-exempt — checklist
  "projectType": "3-Story...",     // Free text — PROJECT INFORMATION
  "architect": "ADEC...",          // Free text — PROJECT INFORMATION
  "notes": "Combined lots...",     // Free text — shown in ZONING PARAMETERS > NOTES
  "scopeOfWork": "Redevelop...",   // Full project narrative — SCOPE OF WORK panel
  "cornerVisibilityTriangle": true,// Draw corner visibility triangle on map — true/false
  "cornerVisTriSize": 25,          // Triangle leg size in feet
  "cornerVisCorner": "SW",         // Which corner: "NW", "NE", "SW", "SE"
  "densityBonus": true,            // Enable density bonus section in checklist
  "inspectors": [                  // Array of city inspector contacts
    { "name": "Combination", "val": "Wesley Tukker (619-446-5362)" },
    { "name": "Structural",  "val": "Ricardo Ordonez (619-446-5123)" }
  ],
  "planningAreas": [               // Array of planning & transit overlay rows
    { "name": "COMMUNITY PLAN AREA",        "val": "MID-CITY: CITY HEIGHTS" },
    { "name": "TRANSIT PRIORITY AREA (TPA)", "val": "Yes" }
  ],
  "overlayZones": [                // Array of overlay zone rows
    { "name": "TRANSIT AREA OVERLAY", "val": "Yes" },
    { "name": "VERY HIGH FIRE HAZARD", "val": "No" }
  ]
}
```

### `saved` block — auto-managed fields (do not edit)

```json
{
  "lat": 32.755,          // Map center latitude (set once from parcel centroid, then saved on drag)
  "lng": -117.093,        // Map center longitude
  "rotation": 0,          // Map rotation in degrees (0 = north up)
  "locked": false,        // Whether lot boundary is locked
  "setbacks": { "front": 10, "rear": 10, "sideL": 0, "sideR": 0 },
  "buildings": [...],     // Array of building footprint objects (see ARCHITECTURE.md §8)
  "activeBuilding": 0,    // Index of currently selected building tab
  "vehicles": [...],      // Vehicle overlay objects
  "mapOpacity": 0.7,      // Aerial tile opacity
  "chainWOffset": 0,      // Chain dimension W offset
  "chainDOffset": 0,      // Chain dimension D offset
  "freeDrag": true,       // Free drag mode (always true by default)
  "snapEdge": false       // Snap-to-edge toggle
}
```

---

## 6. How Each Field Drives the Dashboard

### Map rendering pipeline

```
site.lotWidth + site.lotDepth
    → MapEngine draws a rectangle polygon (lot boundary)
    → SetbackEngine draws inset setback rectangle
    → Buildings are positioned relative to lot center using offsetX/offsetY

site.frontSetback/rearSetback/sideSetback
    → Default values loaded into setback inputs on init
    → SetbackEngine.applySetbacks() draws the inset overlay
    → Coordinate math: xShift = (front-rear)/2, yShift = (sideR-sideL)/2

site.zoning → banner + PROJECT INFORMATION > BASE ZONE
site.lotSF  → LAND COVERAGE > LOT SIZE + density calculation
site.baseFAR → ZONING PARAMETERS > BASE FAR + used in FAR check
site.densityPerSF → LAND COVERAGE > MIN LOT / DENSITY = lotSF / densityPerSF
```

### Info panel rendering

```
site.address       → header address cell, PROJECT INFORMATION > PROJECT ADDRESS
site.apn           → header APN cell, PROJECT INFORMATION > PARCEL #
site.legalDescription → PROJECT INFORMATION > LEGAL DESCRIPTION
site.yearBuilt     → PROJECT INFORMATION > YEAR BUILT
site.occupancyGroup → PROJECT INFORMATION > OCCUPANCY GROUP
site.projectType   → PROJECT INFORMATION > PROJECT TYPE
site.architect     → PROJECT INFORMATION > ARCHITECT
site.maxHeight     → PROJECT INFORMATION > HEIGHT RESTRICTION
site.frontSetback + rearSetback + sideSetback → PROJECT INFORMATION > STANDARD SETBACKS
site.scopeOfWork   → SCOPE OF WORK panel (full-width, above map)
site.notes         → ZONING PARAMETERS > NOTES
site.inspectors[]  → CITY INSPECTOR CONTACTS (dynamic rows)
site.planningAreas[] → PLANNING & TRANSIT AREAS (dynamic rows)
site.overlayZones[]  → OVERLAY ZONES (dynamic rows)
```

### Checklist rendering

```
window.__SITE_DEFAULTS__    → all site fields baked into PreApp_Checklist.html at build time
site.densityBonus           → shows/hides State Density Bonus section
site.densityPerSF           → base unit count = floor(lotSF / densityPerSF)
site.baseFAR                → max buildable SF calculation
site.nefRatePerSF           → NEF fee = buildable SF × nefRatePerSF
site.difPerUnit             → DIF total = unit count × difPerUnit
site.affordabilityPct       → target affordable units = total × affordabilityPct
site.difWaiverSF            → units ≤ this SF exempt from DIF
```

### LISP export (AutoCAD)

```
site.cadZone → selects projection (e.g. CA_VI = California State Plane Zone VI, EPSG:2229)
saved.lat/lng + saved.rotation → converted to state plane feet via proj4js
Buildings → exported as polylines with correct dimensions + positions in CAD coordinates
```

---

## 7. Adding a New Site — Step-by-Step

1. **Collect all data** — work through the checklist in §4

2. **Get parcel centroid**
   - Open Google Maps, navigate to parcel
   - Right-click center of lot → click coordinates shown → note `lat, lng`

3. **Get parcel polygon** (optional but recommended for irregular lots)
   - Open county GIS portal → find parcel → export/note vertex coordinates
   - Format: array of `[lat, lng]` pairs, clockwise from NW corner
   - Only needed if lot is significantly irregular; rectangular lots use `lotWidth × lotDepth`

4. **Create the JSON file**
   - Copy `reference/site-template.json` (see §13) to `data/sites/{state}-{number}_{street}.json`
   - Fill all `site` fields using data from §4
   - Set `saved.lat` and `saved.lng` to parcel centroid
   - Set `saved.rotation` to 0 (adjust in-app later)

5. **Build**
   ```powershell
   powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1
   ```

6. **Launch dev server**
   ```powershell
   powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1 serve
   ```
   Open `http://localhost:3030`

7. **Switch to new site** — use the State dropdown + site switcher in the header

8. **Align the map**
   - Use the rotation slider (Align Map panel) to align lot north with screen
   - Use lat/lng inputs to nudge the map center if needed
   - Click Save (auto-saves to `saved` block)

9. **Place buildings**
   - Add building tabs in the Building Config panel
   - Set W, D, stories, orientation
   - Drag buildings into position on the map
   - Buildings snap to lot edges and to each other (Snap Edge toggle)

10. **Set setbacks**
    - Verify setback values in the Align Map panel
    - Click Save Setbacks

11. **Edit site info** (if needed)
    - Click **✏ Edit Site Info** (purple FAB button, bottom-right)
    - Fill/update any fields
    - Click Save & Rebuild

12. **Push to GitHub** for public mirror
    ```bash
    git add -A && git commit -m "Add: {site name} site config"
    git push
    ```

---

## 8. Parcel Polygon Coordinates

Only `wa-405_126th.json` currently uses a custom `parcelPolygon` array (because Burien has an irregular lot). The others use the simple rectangle from `lotWidth × lotDepth`.

**When to add a polygon:**
- Lot is not a simple rectangle (irregular shape, flag lot, pie-shaped)
- Corner lots with a visibility triangle cutoff

**How to get coordinates:**
1. Open county GIS portal (e.g. King County GIS: `gismaps.kingcounty.gov`)
2. Search parcel by APN
3. Click parcel → "View parcel details" or "Export"
4. Copy vertex coordinates (lat/lng, decimal degrees, WGS84)
5. Order clockwise starting from the northwest corner

**Format in JSON:**
```json
"parcelPolygon": [
  [47.49023, -122.33933],   // NW
  [47.49023, -122.33872],   // NE
  [47.48977, -122.33872],   // SE
  [47.48977, -122.33933]    // SW
]
```

If `parcelPolygon` is present, MapEngine uses it instead of the rectangle. If absent, MapEngine draws `lotWidth × lotDepth` centered on `lat/lng`.

---

## 9. Inspector Contacts — Where to Find

| Jurisdiction | Source |
|-------------|--------|
| San Diego | DSD Staff Directory: `sandiego.gov/development-services/contact` → Inspection Services |
| Garden Grove | Building & Safety: `garden-grove.org/government/departments/community-development/building-safety` |
| Burien / King County | DPER: `kingcounty.gov/en/dept/dls/permits-licensing-regulations` |

Call the permit counter and ask: "Can I get the name and direct number for the Combination, Structural, Electrical, Mechanical, and Grading inspectors for projects in [address]?"

**Format in JSON:**
```json
"inspectors": [
  { "name": "Combination", "val": "First Last (###-###-####)" },
  { "name": "Structural",  "val": "First Last (###-###-####)" },
  { "name": "Electrical",  "val": "First Last (###-###-####)" },
  { "name": "Mechanical",  "val": "First Last (###-###-####)" },
  { "name": "Grading",     "val": "First Last (###-###-####)" }
]
```

---

## 10. Planning & Transit Overlays — Where to Find

### San Diego

| Overlay | Source |
|---------|--------|
| Community Plan Area + Land Use | San Diego General Plan Land Use Map or ZIMS zoning inquiry |
| CCHS Tier | `sandiego.gov/planning/programs/housing/climate-solutions` → CCHS map |
| TPA (Transit Priority Area) | SANDAG GIS or State HCD TPA map |
| Parking Standards (PSTPA) | Confirmed if TPA = Yes and project is residential |
| Mobility Choices / Zone | San Diego Municipal Code Appendix A, Figure A-1 |
| Transit Area Overlay | ZIMS or zoning map — shown as "TA" overlay |
| Airport Influence Area | Montgomery-Gibbs or SDIA Land Use Compatibility Plan PDF |
| Coastal Overlay | Shown on ZIMS as "Coastal Zone" |
| Very High Fire Hazard | Cal Fire FHSZ map: `osfm.fire.ca.gov/divisions/fire-resource-assessment/fhsz-maps` |
| Fault / Alquist-Priolo | CGS AP Zone map: `maps.conservation.ca.gov/cgs/ap` |

**Format in JSON:**
```json
"planningAreas": [
  { "name": "COMMUNITY PLAN AREA",         "val": "MID-CITY: CITY HEIGHTS" },
  { "name": "LAND USE DESIGNATION",         "val": "Commercial / Mixed Use A (73 du/ac)" },
  { "name": "CCHS (HOUSING SOLUTIONS)",     "val": "Yes — FAR Tier 3: 6.5 FAR" },
  { "name": "TRANSIT PRIORITY AREA (TPA)", "val": "Yes" },
  { "name": "PARKING STANDARDS (PSTPA)",   "val": "Yes (0 Parking Required)" },
  { "name": "MOBILITY CHOICES",            "val": "Yes — Mobility Zone 2" }
],
"overlayZones": [
  { "name": "TRANSIT AREA OVERLAY",  "val": "Yes" },
  { "name": "AIRPORT INFLUENCE AREA", "val": "No" },
  { "name": "COASTAL OVERLAY",        "val": "No" },
  { "name": "VERY HIGH FIRE HAZARD",  "val": "No" },
  { "name": "FAULT ZONE",             "val": "No" }
]
```

---

## 11. Fee Schedule Fields — Where to Find

| Field | What it is | San Diego source |
|-------|-----------|-----------------|
| `nefRatePerSF` | Neighborhood Enhancement Fee — per SF of new residential construction | DSD Fee Schedule PDF (updated annually) → "NEF" table |
| `affordabilityPct` | % of units that must be affordable for density bonus | State density bonus law (Gov Code 65915) — typically 10–24% depending on bonus requested |
| `difPerUnit` | Development Impact Fee — charged per new unit | DSD DIF schedule → residential category |
| `difWaiverSF` | Units at or below this SF are DIF-exempt | DSD affordable housing DIF waiver policy |

**San Diego DSD Fee Schedule:**
`sandiego.gov/development-services/forms-publications/fee-schedules`
→ Current year → "Building Fee Schedule" PDF → search "NEF" and "DIF"

---

## 12. Workflow: Day-to-Day Use

### Starting a session
1. Open terminal in project folder
2. Run: `powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1 serve`
3. A browser window opens at `http://localhost:3030`
4. Select site from the State dropdown + site switcher

### Editing site info
- Click **✏ Edit Site Info** (purple FAB) → edit fields → **Save & Rebuild**
- Page auto-reloads with updated data

### Moving buildings
- Click a building tab → drag on map
- Snap Edge button locks building to lot boundary
- Building Config panel: set W, D, stories, orientation, spacing

### Saving session state
- Auto-saves on every interaction (auto-save flash badge = confirmed)
- Manual save: FAB → **Save Config** (downloads site JSON)

### Publishing
```bash
git add -A
git commit -m "Session: [description]"
git push
```
→ GitHub Actions syncs `docs/` → public mirror updates in ~5 min

---

## 13. Site JSON Template (blank)

Save as `data/sites/{state}-{number}_{street}.json` and fill every field:

```json
{
  "project": "ProjectBook-Planner",
  "site": {
    "siteId": "XX-SITENAME",
    "address": "",
    "apn": "",
    "legalDescription": "",
    "yearBuilt": "",
    "occupancyGroup": "",
    "zoning": "",
    "cadZone": "CA_VI",
    "lotWidth": 0,
    "lotDepth": 0,
    "lotSF": 0,
    "commercialDepth": 0,
    "baseFAR": 0,
    "commFAR": 0,
    "maxHeight": 0,
    "baseHeightLimit": 0,
    "cchsMaxHeight": 0,
    "frontSetback": 0,
    "rearSetback": 0,
    "sideSetback": 0,
    "densityPerSF": 0,
    "nefRatePerSF": 0,
    "affordabilityPct": 0,
    "difPerUnit": 0,
    "difWaiverSF": 0,
    "projectType": "",
    "architect": "",
    "notes": "",
    "scopeOfWork": "",
    "cornerVisibilityTriangle": false,
    "cornerVisTriSize": 25,
    "cornerVisCorner": "SW",
    "densityBonus": false,
    "inspectors": [],
    "planningAreas": [],
    "overlayZones": []
  },
  "saved": {
    "lat": 0,
    "lng": 0,
    "rotation": 0,
    "locked": false,
    "setbacks": { "front": 0, "rear": 0, "sideL": 0, "sideR": 0 },
    "buildings": [],
    "activeBuilding": 0,
    "vehicles": [],
    "mapOpacity": 0.7,
    "chainWOffset": 0,
    "chainDOffset": 0,
    "freeDrag": true,
    "snapEdge": false
  }
}
```

---

*For technical internals (engines, build pipeline, coordinate math, snap algorithm) see `reference/ARCHITECTURE.md`.*
