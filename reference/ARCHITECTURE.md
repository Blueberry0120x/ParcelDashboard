# ProjectBook-Planner — Architecture Reference

> Last updated: 2026-03-25
> Covers: build pipeline, all engines, state fields, coordinate system, save flow, snap logic, site switching

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [File Structure](#2-file-structure)
3. [Build Pipeline](#3-build-pipeline)
4. [Bootstrap Init Order](#4-bootstrap-init-order)
5. [Engine Responsibilities](#5-engine-responsibilities)
6. [ConfigEngine.state — All Fields](#6-configenginestate--all-fields)
7. [ConfigEngine.data — Site Identity Fields](#7-configenginedata--site-identity-fields)
8. [Building Object Schema](#8-building-object-schema)
9. [Coordinate System](#9-coordinate-system)
10. [Save Flow](#10-save-flow)
11. [_payload() Serialization](#11-_payload-serialization)
12. [Snap Logic](#12-snap-logic)
13. [Site Switching](#13-site-switching)
14. [Engine Call Graph](#14-engine-call-graph)
15. [Data Flow Diagram](#15-data-flow-diagram)

---

## 1. Project Overview

Two standalone compiled HTML files built from modular JS/CSS sources via a PowerShell build pipeline:

| Output | Source | Purpose |
|--------|--------|---------|
| `Output/InteractiveMap.html` | `src/index.html` + `src/js/*.js` + `src/css/style.css` | Leaflet map with draggable buildings, chain dimensions, setbacks, vehicle overlays |
| `Output/PreApp_Checklist.html` | `src/checklist.html` | Pre-application checklist with State Density Bonus calculator (React, single-file) |

Both are self-contained — all CSS and JS are inlined. No external dependencies at runtime except CDN-hosted Leaflet, proj4js, and html2canvas.

**Twin Publish:** Every build also copies both files to `docs/`. Pushing `docs/` to `main` triggers `mirror-public.yml` which force-pushes to `Blueberry0120x/ParcelDashboard` (GitHub Pages).

---

## 2. File Structure

```
src/
  index.html              -- Map dev shell (link tags replaced by inlined content at build)
  checklist.html          -- Checklist source (React, Babel-compiled in-browser)
  css/style.css           -- All CSS (inlined at build)
  js/
    engine-config.js      -- ConfigEngine: state + site data + CAD zone lookup
    engine-ui.js          -- UIEngine: banner, info tables, lot size toggle
    engine-map.js         -- MapEngine: Leaflet, buildings, snap, vehicles, controls
    engine-elevation.js   -- ElevationTool: profile sampling
    engine-setback.js     -- SetbackEngine: building config form, dimensions, FAR
    engine-export.js      -- ExportEngine: save/load/_payload/LISP/image/download
    engine-resize.js      -- ResizeEngine: sidebar drag handle
    bootstrap.js          -- window.onload init sequence

data/
  site-data.json          -- { "activeSiteId": "CA-EUCLID" } — active site pointer
  sites/
    ca-westminster.json   -- { site: {...}, saved: {...} }
    euclid.json           -- { site: {...}, saved: {...} }
    wa-burien.json        -- { site: {...}, saved: {...} }

Output/                   -- Compiled single-file HTML (gitignored from builds? No — committed)
docs/                     -- Mirror of Output/ (triggers GitHub Pages deploy on push)
reference/                -- This file + zoning code library + best practices
report/                   -- Controller compliance reports (.gitkeep)
config/backup/            -- Checklist JSON backups (untracked)
controller-note/          -- NP_ClaudeAgent cross-repo messaging
Engine_InteractiveParcelMap.ps1  -- Build + dev server script
Engine_InteractiveParcelMap.cmd  -- Launcher wrapper
```

---

## 3. Build Pipeline

### Invocation

```powershell
.\Engine_InteractiveParcelMap.ps1          # compile only (Mode=reload)
.\Engine_InteractiveParcelMap.ps1 debug    # compile + open in browser
.\Engine_InteractiveParcelMap.ps1 serve    # compile + localhost:7734 dev server
```

### Key Variables

| Variable | Value |
|----------|-------|
| `$base` | Script directory |
| `$src` | `$base/src` |
| `$outputDir` | `$base/Output` |
| `$outputMap` | `Output/InteractiveMap.html` |
| `$outputChk` | `Output/PreApp_Checklist.html` |
| `$docsDir` | `$base/docs` |
| `$publicUrl` | `https://blueberry0120x.github.io/ParcelDashboard/` |
| `$Port` | `7734` (default) |

### Build Stages

**Stage 1 — Get-InjectScript**
1. Read `data/site-data.json` → get `activeSiteId`
2. Scan `data/sites/*.json` for matching `site.siteId`
3. Load that site file
4. Merge: project name + `.site.*` (static) + `.saved.*` (session state)
5. Return `<script>window.__SITE_DEFAULTS__ = {...};</script>`

**Stage 2 — Get-SiteListScript**
1. Scan all `data/sites/*.json`
2. Extract `siteId`, `address`, `apn`, filename from each `.site`
3. Return `<script>window.__SITE_LIST__ = [{...}, ...];</script>`

**Stage 3 — Build-Html**
1. Load `src/index.html`
2. Inline CSS: `<link href="css/style.css">` → `<style>...full content...</style>`
3. Inline JS (in order): engine-config, engine-ui, engine-map, engine-elevation, engine-setback, engine-export, engine-resize, bootstrap — each `<script src="...">` → `<script>...full content...</script>`
4. Inject `__SITE_DEFAULTS__` before `</head>`
5. Inject `__SITE_LIST__` before `</head>`
6. Write `Output/InteractiveMap.html`

**Stage 4 — Build-Checklist**
1. Load `src/checklist.html`
2. Inject `__SITE_DEFAULTS__` and `__SITE_LIST__` (no JS/CSS inlining — checklist is self-contained React)
3. Write `Output/PreApp_Checklist.html`

**Stage 5 — Twin Publish**
```powershell
Copy-Item $outputMap  (Join-Path $docsDir "InteractiveMap.html")  -Force
Copy-Item $outputChk  (Join-Path $docsDir "PreApp_Checklist.html") -Force
```

**Stage 6 — Serve Mode Routes**

| Method | Path | Action |
|--------|------|--------|
| GET | `/` | Serve `Output/InteractiveMap.html` |
| GET | `/checklist` | Serve `Output/PreApp_Checklist.html` |
| POST | `/save` | Merge saved state into site JSON, rebuild both files |
| POST | `/api/sites/:id/activate` | Update active site pointer, rebuild |
| POST | `/backup-checklist` | Write checklist JSON to `config/backup/` |
| GET | `/api/sites` | Return all sites with active flag |

**POST /save detail:**
1. Parse incoming JSON body
2. Extract `siteId`
3. Load existing `data/sites/<siteId>.json`
4. Preserve `.site` key (static identity — never overwritten)
5. Overwrite `.saved` and `.checklist` from incoming payload
6. Rebuild both HTML files
7. Return `{"ok":true}`

---

## 4. Bootstrap Init Order

Entry point: `window.onload` in `bootstrap.js`

```
1.  document.body.style.zoom = '0.9'
2.  ConfigEngine.init()
      ├─ Load window.__SITE_DEFAULTS__
      ├─ Auto-detect CAD zone from address
      ├─ Migrate legacy localStorage keys
      └─ Populate ConfigEngine.state

3.  Validate ConfigEngine.data fields:
    ["address","apn","zoning","width","depth","lotSF"]
    → Skip UIEngine.init if missing (log error)

4.  UIEngine.init()
      ├─ Populate banner (address, apn, zoning, dimensions, SF)
      ├─ Populate info panels (FAR, density, height, setbacks, inspectors)
      └─ Attach unit toggle (SF ↔ AC)

5.  Sync toggle button styles (snapEdge, freeDrag) from ConfigEngine.state

6.  Wire vehicle input handlers (#vehType, #vehOrient)
    → Restore from ConfigEngine.state.vehicles via MapEngine.drawVehicles()

7.  Populate CAD zone dropdown (#cadZoneSelect)
    → Filtered by state code from siteId (e.g., "CA" → CA_V, CA_VI)

8.  Populate project title (#project-title)

9.  Populate state filter & site switcher from window.__SITE_LIST__
    → Attach change listener: refilter sites on state change

10. MapEngine.init()
      ├─ Create Leaflet map with tile layers (Satellite, Street, Topo USGS, Topo Esri)
      ├─ Create lot polygon, setback polygon, commercial polygon
      ├─ Create building drag markers
      ├─ Build controls: layers, opacity panel, compass, help, dim-drag toggle, recenter
      └─ fitBounds to parcelPolygon if available

11. SetbackEngine.initBuildingConfig()
      ├─ Populate building selector tabs
      └─ Seed active building form inputs

12. ElevationTool.init()

13. ResizeEngine.init()
      └─ Attach colDivider drag, sync infoColLeft width to sidebarPanel
```

**Error handling:** Every init step wrapped in `safeRun()` — exceptions logged, init continues.

---

## 5. Engine Responsibilities

### ConfigEngine (`engine-config.js`)
- Owns: all session state, site identity, CAD projection lookup
- Key exports: `ConfigEngine.state`, `ConfigEngine.data`, `ConfigEngine.CAD_SYSTEMS`
- `init()` — load, migrate, merge defaults
- `reset()` — clear localStorage, restore hardcoded defaults
- Does NOT render anything

### UIEngine (`engine-ui.js`)
- Owns: banner display, info tables (project info, land coverage, zoning params, inspector contacts)
- `init()` — populate all info elements from ConfigEngine.data
- `updateLotSizeDisplay()` — SF ↔ AC toggle
- No map interaction

### MapEngine (`engine-map.js`)
- Owns: Leaflet map instance, all polygons, drag markers, vehicle markers, Leaflet controls
- Key properties: `map`, `lotPoly`, `setbackPoly`, `commPoly`, `dragMarker`, `bldgMarkers[]`, `vehicleMarkers[]`
- `init()` — create map and all layers
- `createBuildingMarker(idx)` — draggable marker with snap + clamp logic
- `_applySnap(idx, offsetX, offsetY)` — magnetic snap (8 ft threshold)
- `toggleSnapEdge()` — toggle snap, save state
- `render()` — redraw all polygons from current state
- `buildRecenterControl()` — ⊕ button that calls fitBounds to lot

### SetbackEngine (`engine-setback.js`)
- Owns: building config form, setback inputs, dimension annotations, FAR display
- `initBuildingConfig()` — wire all building inputs + restore state
- `drawBuilding(skipMarker)` — render active building footprint(s)
- `updateBldgDimLabels()` — redraw all dimension labels
- `updateFAR()` — calculate and display FAR, unit count, buildable area
- `_buildingExtents(bldg)` — returns `{halfWidth, halfDepth}` (axis-aligned, rotation-aware)
- `_clampToLot(cx, cy, bldg)` — constrain full stack to lot boundary
- `saveConfig()` / `applySetbacks()` / `saveSetbacks()` — all call `ExportEngine.save()`

### ExportEngine (`engine-export.js`)
- Owns: all persistence — localStorage, server push, file download, LISP export
- `save()` — **the one save function** (sync inputs → localStorage → POST /save → flash)
- `_payload()` — single source of truth for persisted state
- `_pushToServer()` — no-op outside localhost (safe to call anywhere)
- `generateLISP()` — AutoCAD PLINE boundary in State Plane coords
- `exportImage()` — html2canvas PNG
- `downloadConfig()` / `saveToFile()` — JSON download

### ResizeEngine (`engine-resize.js`)
- `init()` — column divider mousedown/mousemove/mouseup
- Syncs `infoColLeft.style.width` to `sidebarPanel.offsetWidth`
- Width constraints: 240px min, 700px max
- Calls `MapEngine.map.invalidateSize()` on resize

### Bootstrap (`bootstrap.js`)
- `window.onload` — orchestrates all engine init in correct order
- `safeRun(label, fn)` — try/catch wrapper for each engine
- `switchSite(siteId)` — global function for site dropdown

---

## 6. ConfigEngine.state — All Fields

| Field | Type | Default | Purpose |
|-------|------|---------|---------|
| `lat` | float | 32.755575 | Site anchor latitude (WGS84) |
| `lng` | float | -117.09185 | Site anchor longitude (WGS84) |
| `rotation` | float | 10.0 | Lot rotation from true north (degrees) |
| `locked` | boolean | false | Prevent building drag when true |
| `unitMode` | string | `'SF'` | Display unit: `'SF'` or `'AC'` |
| `mapOpacity` | integer | 70 | Basemap tile opacity (0–100) |
| `setbacksApplied` | boolean | false | Whether setback polygons are active |
| `freeDrag` | boolean | true | Skip chain-order constraint between buildings |
| `snapEdge` | boolean | true | Magnetic snap to lot edges + other buildings |
| `setbacks` | object | `{front:10,rear:10,sideL:0,sideR:0}` | Setback distances in feet |
| `buildings` | array | `[{...}]` | Array of building objects (see §8) |
| `activeBuilding` | integer | 0 | Index of selected building |
| `commFront` | boolean | false | Commercial frontage mode |
| `showBldgDims` | boolean | false | Show dimension annotations |
| `hiddenDimKeys` | array | `[]` | Keys of hidden dimension labels |
| `chainWOffset` | float | 0 | Width-chain drag offset |
| `chainDOffset` | float | 0 | Depth-chain drag offset |
| `vehicles` | array | `[]` | Vehicle overlay objects |
| `activeVehicle` | integer | -1 | Selected vehicle index (−1 = none) |
| `isSnapping` | boolean | false | Snap-to-grid toggle (reserved) |

---

## 7. ConfigEngine.data — Site Identity Fields

Loaded from `window.__SITE_DEFAULTS__` (injected at build time from active site JSON).

| Field | Source key | Purpose |
|-------|-----------|---------|
| `address` | `sd.address` | Street address |
| `apn` | `sd.apn` | Assessor Parcel Number |
| `zoning` | `sd.zoning` | Zoning designation |
| `width` | `sd.lotWidth` | Lot width (ft) |
| `depth` | `sd.lotDepth` | Lot depth (ft) |
| `commercialDepth` | `sd.commercialDepth` | Commercial frontage depth (ft) |
| `lotSF` | `sd.lotSF` | Lot area (sq ft) |
| `cadZone` | `sd.cadZone` | CAD projection zone (e.g., `CA_VI`) |
| `parcelPolygon` | `sd.parcelPolygon` | GIS polygon `[[lat,lng],...]` (optional) |
| `siteId` | `sd.siteId` | Unique site ID (e.g., `CA-EUCLID`) |
| `baseFAR` | `sd.baseFAR` | Base Floor Area Ratio |
| `commFAR` | `sd.commFAR` | Commercial FAR |
| `maxHeight` | `sd.maxHeight` | Max building height (ft) |
| `baseHeightLimit` | `sd.baseHeightLimit` | Base height limit (ft) |
| `cchsMaxHeight` | `sd.cchsMaxHeight` | CCHS tier max height (ft) |
| `frontSetback` | `sd.frontSetback` | Default front setback (ft) |
| `rearSetback` | `sd.rearSetback` | Default rear setback (ft) |
| `sideSetback` | `sd.sideSetback` | Default side setback (ft) |
| `densityPerSF` | `sd.densityPerSF` | 1 DU per N sq ft |
| `nefRatePerSF` | `sd.nefRatePerSF` | Noise exposure fee ($/sf) |
| `affordabilityPct` | `sd.affordabilityPct` | Affordability % requirement |
| `difPerUnit` | `sd.difPerUnit` | Density incentive fee per unit ($) |
| `difWaiverSF` | `sd.difWaiverSF` | DIF waiver threshold (sf) |
| `projectType` | `sd.projectType` | Development type (e.g., "3-Story Townhome") |
| `architect` | `sd.architect` | Architect name |
| `notes` | `sd.notes` | Additional zoning notes |
| `inspectors` | `sd.inspectors` | `[{name, val}, ...]` contact table |
| `cornerVisibilityTriangle` | `sd.cornerVisibilityTriangle` | Show corner vis triangle |
| `cornerVisTriSize` | `sd.cornerVisTriSize` | Triangle leg size (ft) |
| `cornerVisCorner` | `sd.cornerVisCorner` | Which corner: `'SW'`, `'NE'`, etc. |
| `densityBonus` | `sd.densityBonus` | State density bonus applies |

---

## 8. Building Object Schema

Every element of `ConfigEngine.state.buildings[]`:

```javascript
{
  // Position & orientation
  orientation:  float,   // Rotation from lot axis (degrees, 0–360)
  offsetX:      float,   // Center X in offset space (ft) — see §9
  offsetY:      float,   // Center Y in offset space (ft) — see §9

  // Footprint
  W:            float,   // Width (shorter dimension, ft)
  D:            float,   // Depth (longer dimension, ft)

  // Stacking
  count:        integer, // Number of parallel copies to render
  spacing:      float,   // Gap between copies (ft) — inter-building distance
  stackSpacing: float,   // Additional offset between stacked units (ft)
  stackAngle:   float,   // Direction of stacking (degrees, 0–360)
                         //   0=→ depth axis, 90=↑ width axis, 180=←, 270=↓

  // Anchoring & height
  anchor:       string,  // 'front' | 'center' | 'rear' — dimension reference baseline
  stories:      integer, // Number of floors
  floorHeight:  float    // Height per story (ft, typically 9–14)
}
```

**Derived values (not stored):**
- Total height = `stories × floorHeight`
- Footprint area = `W × D`
- FAR contribution = `W × D × stories / lotSF`

---

## 9. Coordinate System

### Local Space (Lot-Centered)

- **Origin:** Lot center (`state.lat`, `state.lng`)
- **Units:** Feet
- **X-axis:** Depth direction (front→rear)
- **Y-axis:** Width direction (left→right)
- **Rotation:** `state.rotation` degrees clockwise from true north

### Conversion Factors

```javascript
F_LAT = 364566                              // ft per degree latitude
F_LNG = 365228 * cos(state.lat * π / 180)  // ft per degree longitude (lat-adjusted)
```

### Marker LatLng → Local (lx, ly)

```javascript
rx = (lng_marker - state.lng) * F_LNG
ry = (lat_marker - state.lat) * F_LAT
rad = state.rotation * π / 180

lx = rx * cos(rad) + ry * sin(rad)   // along depth axis
ly = -rx * sin(rad) + ry * cos(rad)  // along width axis
```

### lx/ly → offsetX/offsetY (Setback-Adjusted)

When setbacks are asymmetric, the effective center of the buildable zone shifts:

```javascript
xShift = (front - rear) / 2
yShift = (sideR - sideL) / 2

offsetX = lx - xShift
offsetY = ly - yShift
```

**Purpose:** `offsetX = 0` when building center is at the midpoint of the front–rear buildable zone. This keeps the snap math clean for asymmetric lots.

### Lot Edge Positions in Offset Space

```javascript
lotFront  = lotHalfD  - front  - xShift   // front setback line (max X)
lotRear   = -lotHalfD + rear   - xShift   // rear setback line (min X)
lotLeft   = lotHalfW  - sideL  - yShift   // left boundary (max Y)
lotRight  = -lotHalfW + sideR  - yShift   // right boundary (min Y)
```

### Building Extents (Rotation-Aware AABB)

```javascript
hw = W / 2,  hd = D / 2
bRad = orientation * π / 180
aC = |cos(bRad)|,  aS = |sin(bRad)|

halfDepth = hd * aC + hw * aS   // half-extent along X (depth direction)
halfWidth = hd * aS + hw * aC   // half-extent along Y (width direction)
```

Building edges:
```
thisRight = offsetX + halfDepth   // front face
thisLeft  = offsetX - halfDepth   // rear face
thisTop   = offsetY + halfWidth   // left face
thisBot   = offsetY - halfWidth   // right face
```

---

## 10. Save Flow

`ExportEngine.save()` is the **only** function that persists state. Every mutating action must call it.

```
ExportEngine.save()
│
├─ 1. Sync setback inputs → ConfigEngine.state.setbacks
│     { front, rear, sideL, sideR } ← DOM #sb-front, #sb-rear, #sb-side-l, #sb-side-r
│
├─ 2. Sync active building form → ConfigEngine.state.buildings[activeBuilding]
│     orientation, W, D, offsetX, offsetY, count, stackSpacing,
│     stackAngle, stories, floorHeight, anchor (from active anchor button)
│
├─ 3. Sync toggles
│     commFront     ← #commFrontCheck.checked
│     showBldgDims  ← MapEngine.showBldgDims
│
├─ 4. _payload() → { project, siteId, saved: {...}, checklist: {...} }
│
├─ 5. localStorage.setItem('site_state', JSON.stringify(payload))
│
├─ 6. _pushToServer()  ← no-op if not localhost
│     POST /save  Content-Type: application/json  Body: payload
│
└─ 7. _showFlash() — "✓ Auto-saved" badge for 2 seconds
```

**Triggers that call save():**
- Building drag end
- All building input changes (W, D, orientation, stories, etc.)
- Setback save button
- Save Config button
- Lock/Unlock toggle
- commFront toggle
- snapEdge toggle
- freeDrag toggle
- Vehicle add/remove/move
- FAB Save Config button

---

## 11. _payload() Serialization

The canonical serialization. **Every field that must survive sessions must be here.**

```javascript
{
  project:  'ProjectBook-Planner',
  siteId:   ConfigEngine.data.siteId || null,
  saved: {
    lat:             ConfigEngine.state.lat,
    lng:             ConfigEngine.state.lng,
    rotation:        ConfigEngine.state.rotation,
    locked:          ConfigEngine.state.locked,
    setbacks:        ConfigEngine.state.setbacks,
    buildings:       ConfigEngine.state.buildings,
    activeBuilding:  ConfigEngine.state.activeBuilding,
    commFront:       ConfigEngine.state.commFront,
    showBldgDims:    MapEngine.showBldgDims,
    hiddenDimKeys:   [...MapEngine.hiddenDimKeys],   // Set → Array
    chainWOffset:    MapEngine.chainWOffset,
    chainDOffset:    MapEngine.chainDOffset,
    mapOpacity:      ConfigEngine.state.mapOpacity,
    setbacksApplied: ConfigEngine.state.setbacksApplied,
    freeDrag:        ConfigEngine.state.freeDrag ?? true,
    snapEdge:        ConfigEngine.state.snapEdge ?? true,
    vehicles:        ConfigEngine.state.vehicles || [],
    activeVehicle:   ConfigEngine.state.activeVehicle ?? -1
  },
  checklist: { ... }  // from localStorage 'preapp_*' key, if present
}
```

**Note:** `site` identity fields (address, APN, zoning, etc.) are NOT in `_payload()`. They live in `data/sites/<siteId>.json` under the `.site` key and are never overwritten by `POST /save`.

---

## 12. Snap Logic

### Overview

Magnetic snap fires:
1. **During drag** — real-time, creates magnetic feel
2. **On drag-end** — final lock to nearest snap point

Toggle: `MapEngine.toggleSnapEdge()` → `ConfigEngine.state.snapEdge`

### Threshold

```javascript
const THRESHOLD = 8;  // feet — snap fires if edge distance < 8 ft
```

### Algorithm

```javascript
_applySnap(idx, offsetX, offsetY)
// Returns { x, y } — snapped position (or unchanged if no snap within threshold)

bestDistX = THRESHOLD, bestDistY = THRESHOLD
snappedX = offsetX,   snappedY = offsetY

// For each candidate snap point:
//   d = |snap.from - snap.to|
//   if d < bestDist → update bestDist + snappedX/Y = snap.adj

return { x: snappedX.toFixed(1), y: snappedY.toFixed(1) }
```

### Lot Boundary Snaps (2 per axis)

```javascript
// Y-axis (width direction)
{ from: thisTop, to: lotLeft,  adj: lotLeft  - halfWidth }  // left face → left boundary
{ from: thisBot, to: lotRight, adj: lotRight + halfWidth }  // right face → right boundary

// X-axis (depth direction)
{ from: thisRight, to: lotFront, adj: lotFront - halfDepth }  // front face → front setback
{ from: thisLeft,  to: lotRear,  adj: lotRear  + halfDepth }  // rear face → rear setback
```

### Building-to-Building Snaps (5 per axis per other building)

```javascript
// Y-axis
{ from: thisBot,  to: oBot,        adj: oBot + halfWidth }      // bottom-to-bottom align
{ from: thisTop,  to: oTop,        adj: oTop - halfWidth }      // top-to-top align
{ from: thisBot,  to: oTop,        adj: oTop + halfWidth }      // abut: my bottom to their top
{ from: thisTop,  to: oBot,        adj: oBot - halfWidth }      // abut: my top to their bottom
{ from: offsetY,  to: other.offsetY, adj: other.offsetY }       // center-to-center align

// X-axis
{ from: thisLeft,  to: oLeft,      adj: oLeft  + halfDepth }    // left-to-left align
{ from: thisRight, to: oRight,     adj: oRight - halfDepth }    // right-to-right align
{ from: thisLeft,  to: oRight,     adj: oRight + halfDepth }    // abut: my left to their right
{ from: thisRight, to: oLeft,      adj: oLeft  - halfDepth }    // abut: my right to their left
{ from: offsetX,   to: other.offsetX, adj: other.offsetX }      // center-to-center align
```

---

## 13. Site Switching

### UI Components

- `#state-filter` — dropdown of unique state codes from `__SITE_LIST__` (e.g., CA, WA)
- `#site-switcher` — dropdown of sites filtered by selected state

### switchSite(siteId)

```
1. localStorage.setItem('selected_site', siteId)
2. localStorage.setItem('selected_state', siteId.split('-')[0])
3. localStorage.removeItem('site_state')  ← force fresh load
4. If siteId === current: location.reload()
5. Else: POST /api/sites/{siteId}/activate
6. On response ok: location.reload()
```

### Server-Side (Set-ActiveSite)

```
1. Verify site file exists via Get-SiteFile($SiteId)
2. Write { "activeSiteId": "$SiteId" } to data/site-data.json
3. Rebuild InteractiveMap.html
4. Rebuild PreApp_Checklist.html
5. Return $true
```

### On Reload

`ConfigEngine.init()` reads the new active site from `data/site-data.json`, loads its JSON, and injects all fields into `__SITE_DEFAULTS__` at build time.

---

## 14. Engine Call Graph

```
window.onload (bootstrap.js)
  └─ ConfigEngine.init()
  └─ UIEngine.init()
  └─ MapEngine.init()
       └─ SetbackEngine._buildingExtents()  [during snap]
       └─ SetbackEngine._clampToLot()       [during drag]
       └─ SetbackEngine.drawBuilding()      [after drag-end]
  └─ SetbackEngine.initBuildingConfig()
  └─ ElevationTool.init()
  └─ ResizeEngine.init()
       └─ MapEngine.map.invalidateSize()    [on resize]

User action → any engine
  └─ ExportEngine.save()
       └─ ExportEngine._payload()
       └─ localStorage.setItem(...)
       └─ ExportEngine._pushToServer()
            └─ POST /save → ps1 server → Build-Html()
```

---

## 15. Data Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  data/sites/<siteId>.json                       │
│    .site   ← static (address, APN, zoning, FAR) │
│    .saved  ← session (lat, lng, buildings, ...)  │
└────────────────────┬────────────────────────────┘
                     │ Build script merges both keys
                     ▼
┌─────────────────────────────────────────────────┐
│  window.__SITE_DEFAULTS__  (injected in <head>) │
│  window.__SITE_LIST__      (all sites array)    │
└────────────────────┬────────────────────────────┘
                     │ ConfigEngine.init()
                     ▼
┌─────────────────────────────────────────────────┐
│  ConfigEngine.state  (runtime mutable)          │
│  ConfigEngine.data   (runtime read-only)        │
└────┬─────────────────────────────┬──────────────┘
     │ read                        │ write
     ▼                             ▼
  UIEngine          MapEngine / SetbackEngine
  (display)         (interact + render)
                              │
                              │ ExportEngine.save()
                              ▼
                    localStorage['site_state']
                              │
                              │ POST /save (localhost only)
                              ▼
                    data/sites/<siteId>.json (.saved key)
                              │
                              │ Build script rebuilds
                              ▼
                    Output/InteractiveMap.html
                    Output/PreApp_Checklist.html
                              │
                              │ Twin publish (always)
                              ▼
                    docs/InteractiveMap.html
                    docs/PreApp_Checklist.html
                              │
                              │ git push main
                              ▼
                    GitHub Actions mirror-public.yml
                              │
                              ▼
                    ParcelDashboard (GitHub Pages)
                    https://blueberry0120x.github.io/ParcelDashboard/
```

---

## Changelog (notable architectural decisions)

| Date | Change |
|------|--------|
| 2026-03-25 | Twin publish: build always syncs Output → docs/ |
| 2026-03-25 | Snap coordinate fix: lot boundaries converted to offsetX/Y space (xShift/yShift) |
| 2026-03-25 | Magnetic snap: fires during drag event, not only on dragend |
| 2026-03-25 | Info layout: PROJECT INFO + LAND COVERAGE moved from sidebar to info-bottom |
| 2026-03-25 | SITE LOCATION & BASE ZONE panel removed (redundant with PROJECT INFO) |
| 2026-03-25 | Stack angle: 0–360 range, 4-direction cycle button (→ ↑ ← ↓) |
| 2026-03-25 | freeDrag always true — button removed |
| 2026-03-25 | Recenter control added (⊕ button, topleft, fitBounds to lot) |
| 2026-03-25 | SET-ActiveSite renamed from Activate-Site (PS approved verb) |
