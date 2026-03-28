# ProjectBook-Planner

Interactive parcel map and pre-application checklist suite for land development feasibility. Multi-site support (Euclid/San Diego CA, Westminster/Garden Grove CA, Burien WA).

## Output

| File | Purpose |
|------|---------|
| `Output/InteractiveMap.html` | Leaflet map — draggable buildings, chain dimensions, setbacks, vehicle overlays, snap-to-edge |
| `Output/PreApp_Checklist.html` | Pre-application checklist — State Density Bonus calculator, pathway selector, fee estimates |

Both files are fully self-contained (all CSS/JS inlined). Served locally at `localhost:3030` or publicly at [ParcelDashboard (GitHub Pages)](https://blueberry0120x.github.io/ParcelDashboard/).

## Build

```powershell
# Compile only
powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1

# Compile + dev server (localhost:3030, live save)
powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1 serve

# Compile + open in browser
powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1 debug
```

Every build automatically syncs `Output/` to `docs/`. Pushing `docs/` to `main` triggers the public mirror workflow to GitHub Pages.

## Repo Hygiene

Use the cleanup script to detect and archive stale artifacts (backup/junk files) and remove known empty clutter folders.

```powershell
# Preview only (no file changes)
powershell -ExecutionPolicy Bypass -File tools/repo_hygiene.ps1

# Apply cleanup (archive-first, then remove known empty folders)
powershell -ExecutionPolicy Bypass -File tools/repo_hygiene.ps1 -Apply -Reason stale-cleanup
```

Archive output is written to `config/archive/YYYY-MM-DD_reason/`.

## Structure

```
src/
  index.html              -- Map source shell
  checklist.html          -- Checklist source (React/Babel)
  css/style.css           -- All CSS (inlined at build)
  js/
    engine-config.js      -- State + site data + CAD zone lookup
    engine-ui.js          -- Banner, info tables
    engine-map.js         -- Leaflet, buildings, snap, vehicles, controls
    engine-elevation.js   -- Elevation profile tool
    engine-setback.js     -- Building config form, dimensions, FAR
    engine-export.js      -- Save/load/_payload/LISP/image/download
    engine-resize.js      -- Sidebar resize handle
    bootstrap.js          -- window.onload init sequence
data/
  site-data.json          -- { "activeSiteId": "CA-EUCLID" }
  sites/                  -- per-site JSON configs
Output/                   -- Compiled HTML (committed)
docs/                     -- Mirror of Output/ (GitHub Pages source)
reference/
  ARCHITECTURE.md         -- Full architecture reference
Engine_InteractiveParcelMap.ps1  -- Build + dev server
```

## Sites

| Site ID | Address | Zoning |
|---------|---------|--------|
| CA-WESTMINSTER | 11001-11025 Westminster Ave, Garden Grove CA | R-3 |
| CA-EUCLID | 4335 Euclid Ave, San Diego CA | CUPD-CU-2-4 |
| WA-BURIEN | 405 SW 126th St, Burien WA | TBD |

## Architecture

See [`reference/ARCHITECTURE.md`](reference/ARCHITECTURE.md) for full documentation:
- All `ConfigEngine.state` fields and defaults
- Building object schema (every field)
- Coordinate system (offsetX/Y, xShift/yShift, lot edges)
- Save flow step-by-step (`ExportEngine.save()`)
- `_payload()` serialization — every field
- Snap logic (magnetic, lot boundary, building-to-building)
- Build pipeline internals (all stages)
- Bootstrap init order (exact sequence)
- Site switching flow
- Engine call graph and data flow diagram
