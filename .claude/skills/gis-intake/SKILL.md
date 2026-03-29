---
name: gis-intake
description: Full procedure for researching a new site address — parcel lookup, APN, lot area, polygon extraction from GIS portals, and writing the skeleton JSON. Use when adding a new site or verifying parcel data.
---

Walk through the complete GIS intake procedure for a new or existing site.

## Arguments

- `$ARGUMENTS` — address string, or site ID to verify, or "list" to show all sites

## What This Skill Covers

Taking a street address and turning it into a complete site JSON with verified parcel data. This is Flow A in the architecture diagram (`Output/architecture.html`).

## No Browser Engine Runs During This Step

This is purely data research + JSON editing + `py tools/build.py`. The browser engines (MapEngine, SetbackEngine, etc.) are not involved until after the build.

## Step-by-Step Procedure

### 1. Parcel Identity Lookup

**Goal:** Get APN, lot area (SF), lot dimensions, legal description, year built.

**Primary source — California:** ParcelQuest at `assr.parcelquest.com`
- Search by full address including city, state, ZIP
- Visually confirm the pin lands on the correct parcel (not a neighbor)
- Record APN exactly as displayed (with hyphens for San Diego County: `469-690-20-00`)
- Record lot area in SF from assessor — NEVER compute from W x D (irregular lots won't match)
- Record lotWidth and lotDepth if shown (drives rectangle mode when no polygon)
- Record legalDescription (tract/lot/block from deed)
- Record yearBuilt (4-digit year, or "" if vacant)

**Primary source — Washington:** King County Assessor at `blue.kingcounty.com/assessor/eRealProperty`
- APN format: 10-digit, no hyphens (e.g., `0723049368`)

**National fallback:** Regrid at `app.regrid.com` — aggregates county data nationwide

### 2. Coordinates & Geometry

**Goal:** Get lat/lng centroid and decide rectangle vs polygon mode.

**Centroid from Google Maps:**
- Search the address, then right-click the visual CENTER of the lot (not the building front door)
- Click the coordinate pair at top of context menu — copies to clipboard
- First number = latitude (positive for US), second = longitude (negative for US)
- Use 6+ decimal places (11cm accuracy)
- Goes into `saved.lat` and `saved.lng`

**Rectangle vs Polygon decision:**
- Look at satellite view — if 4 right-angle corners, use rectangle mode (leave `parcelPolygon: []`)
- If L-shaped, flag-shaped, pie-shaped, or angled street frontage → need polygon mode

**Polygon extraction from GIS portal:**
- San Diego: SanDag GIS portal or County parcel viewer — search by APN
- Look for Geometry/Coordinates tab, or download as GeoJSON/KML
- Vertices go into `parcelPolygon` as `[[lat1,lng1], [lat2,lng2], ...]`
- Order: counterclockwise, first vertex = front-left corner by convention
- NEVER ingest GIS polygon data without designer approval (feedback rule)

### 3. Zoning Code Research

**Goal:** Get zoning designation, setbacks, FAR, height limit, density.

**Sources by jurisdiction:**
- San Diego: Municipal Code via `sandiego.gov/development-services/zoning`
- Each zone (RM-2-5, CC-3-7, etc.) has a specific code section with tables
- Record: `frontSetback`, `rearSetback`, `sideSetback`, `baseFAR`, `maxHeight`, `densityPerSF`
- For commercial frontage zones: also record `commFAR`, `commercialDepth`

### 4. Fees & Contacts

**Goal:** Get DIF rates, NEF rates, affordability %, inspector contacts.

**Sources:**
- City fee schedules (usually PDFs updated annually)
- Planning department contact pages for inspector names/emails
- Record: `nefRatePerSF`, `difPerUnit`, `difWaiverSF`, `affordabilityPct`, `inspectors[]`

### 5. Write the JSON File

**File location:** `data/sites/{state}-{id}_{name}.json`
**Naming convention:** State abbreviation, hyphen, assessor short ID, underscore, street name
Example: `ca-4335_Euclid.json`

**Structure:**
```json
{
  "site": {
    "address": "...",
    "apn": "...",
    "zoning": "...",
    "lotWidth": 50,
    "lotDepth": 150,
    "lotSF": 7500,
    ... (all 40+ fields)
  },
  "saved": {
    "lat": 32.7556,
    "lng": -117.0919,
    "rotation": 0,
    "buildings": [],
    "setbacks": { "front": 0, "rear": 0, "sideL": 0, "sideR": 0 }
  }
}
```

**TBD format:** For any field not yet confirmed: `"-- TBD: [what] | Source: [where]"`
- TBD is visually distinct in the browser UI
- NEVER use 0 as placeholder — 0 looks like real data and feeds into calculations

### 6. Register in index.json

Add entry to `data/sites/index.json`:
```json
{ "id": "CA-4335_EUCLID", "file": "ca-4335_Euclid.json", "address": "...", "status": "skeleton" }
```

### 7. Update pointer & build

Set `activeSiteId` in `data/site-data.json`, then run `py tools/build.py`.

### 8. Verify in browser

Open `localhost:3040`, confirm:
- Map centers on correct location
- Address/APN show in banner
- Zoning table populated (or shows TBDs)

## Status Lifecycle

- **skeleton** — address + coordinates only, many TBDs
- **partial** — zoning section confirmed, fees/contacts may have TBDs
- **complete** — all 8 sections confirmed, zero TBDs, ready for concept design

## Rules

- ALWAYS use assessor's published lot area — never compute from W x D
- NEVER move saved.lat/lng without recalculating all dependent offsets
- NEVER ingest GIS polygon data without designer approval
- Use TBD strings for unknown fields — never use 0 or empty string as placeholder
- .site key is NEVER touched at runtime — only manual edits + rebuild
