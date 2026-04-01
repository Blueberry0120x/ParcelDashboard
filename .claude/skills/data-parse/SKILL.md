---
name: data-parse
description: How site data flows from JSON through the build pipeline into the browser. Use when adding a new field, debugging why a value doesn't show, or understanding how .site vs .saved works.
---

Trace how a piece of site data gets from JSON on disk into the browser UI.

## Arguments

- `$ARGUMENTS` — the field name (e.g., "baseFAR"), or "add-field" to add a new one, or a symptom like "zoning table shows wrong value"

## The Data Pipeline

```
JSON on disk                    Build pipeline                Browser
─────────────                   ──────────────                ───────
data/sites/ca-4335_Euclid.json
  ├── .site  (you edit manually)  ──→ build.py merges ──→ window.__SITE_DEFAULTS__
  └── .saved (ExportEngine writes)──→   both keys     ──→   (injected into <head>)
                                                              │
                                                              ├──→ ConfigEngine.init()
                                                              │      reads __SITE_DEFAULTS__
                                                              │      populates .data (from .site)
                                                              │      populates .state (from .saved)
                                                              │
                                                              ├──→ UIEngine.init()
                                                              │      reads ConfigEngine.data
                                                              │      writes sidebar text/tables
                                                              │
                                                              └──→ MapEngine/SetbackEngine
                                                                     reads ConfigEngine.state
                                                                     draws on map
```

## Two Keys, Two Lifecycles

| Key | What it holds | Who writes it | When it changes |
|---|---|---|---|
| `.site` | Permanent public record (address, APN, zoning, setbacks, FAR, fees, contacts) | You, manually in VS Code | Only on manual edit + rebuild |
| `.saved` | Live session state (lat, lng, buildings, rotation, vehicles, dims) | ExportEngine.save() via POST /save | Every time user clicks Save |

**Critical rule:** POST /save NEVER touches .site. It preserves .site and overwrites only .saved.

## Where Each Field Type Is Consumed

### .site fields → ConfigEngine.data → UIEngine

These show in the sidebar, zoning tables, inspector cards:
- `address`, `apn`, `zoning` → header banner
- `lotWidth`, `lotDepth`, `lotSF` → lot size display
- `frontSetback`, `rearSetback`, `sideSetback` → zoning parameters table
- `baseFAR`, `commFAR`, `maxHeight` → zoning parameters table
- `densityPerSF` → density calculation in SetbackEngine.updateFAR()
- `nefRatePerSF`, `difPerUnit`, `difWaiverSF`, `affordabilityPct` → fee calculations
- `inspectors[]` → inspector contacts card

### .saved fields → ConfigEngine.state → MapEngine/SetbackEngine

These drive the interactive map:
- `lat`, `lng` → map center + coordinate origin
- `rotation` → lot rotation angle
- `buildings[]` → building footprints (W, D, offsetX, offsetY, count, stacking...)
- `setbacks` → setback polygon (front, rear, sideL, sideR)
- `vehicles[]` → vehicle overlays
- `locked` → position lock toggle
- `mapOpacity` → satellite layer opacity
- `hiddenDimKeys` → which dim segments are hidden
- `chainWOffset`, `chainDOffset` → chain dim repositioning
- `freeDrag`, `snapEdge` → toggle states
- `commFront`, `showBldgDims` → display toggles

## Adding a New Field

### If it's a .site field (permanent, from research):

1. Add it to the site JSON file under `.site`
2. In `engine-config.js` → `init()`: read from `SD.site.newField` with a fallback
3. In `engine-ui.js` → `init()`: display it in the sidebar
4. Run `py tools/build.py` → verify in browser

### If it's a .saved field (session state, user-changeable):

1. Add it to `engine-export.js` → `_payload()` FIRST (this is the spec)
2. In `engine-config.js` → `init()`: load from `SD.saved.newField` with a fallback
3. In the relevant engine: use `ConfigEngine.state.newField`
4. In `engine-export.js` → `save()`: sync the UI input to state before _payload() runs
5. Verify: change value → save → reload → value persists

### Common mistakes when adding fields:

- Added to _payload() but forgot ConfigEngine.init() → value saves but doesn't restore
- Added to ConfigEngine.init() but forgot _payload() → value loads once but doesn't persist
- Edited .site when it should be .saved (or vice versa) → save overwrites your edit
- Used 0 as default instead of a meaningful fallback → 0 feeds into calculations silently

## Debugging: Value Not Showing

1. Check the JSON file — is the field present and correctly spelled?
2. Check the build output — run `py tools/build.py`, look for errors
3. Open browser DevTools → Console → type `window.__SITE_DEFAULTS__` → verify the field is injected
4. Check `ConfigEngine.data` (for .site fields) or `ConfigEngine.state` (for .saved fields)
5. Check the consuming engine — is it reading the field? Check the DOM element ID.

## Build Pipeline Details

**Engine:** `tools/build.py` (Python, canonical)
**What it does:**
1. `get_active_site_id()` — reads pointer from `data/site-data.json`
2. `get_site_file()` — finds matching JSON in `data/sites/`
3. `get_inject_script()` — merges .site + .saved into `__SITE_DEFAULTS__`
4. Also builds `__SITE_LIST__` (all sites for dropdown) and `__ALL_SITE_DATA__` (offline switching)
5. Inlines all CSS + 8 JS files by replacing `<link>` and `<script src>` tags
6. Writes `Output/InteractiveMap.html` and `Output/PreApp_Checklist.html`

**Rebuild trigger:** `py tools/build.py` (manual) or automatic after POST /save on dev server

## Rules

- _payload() is the single source of truth for what gets saved
- .site is NEVER touched at runtime
- Every new .saved field needs BOTH _payload() AND ConfigEngine.init()
- Use TBD strings for unconfirmed .site values, never 0
