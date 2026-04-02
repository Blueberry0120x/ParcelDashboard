---
name: map-sync
description: How the map coordinates work — address alignment, rotation, drag behavior, site switching, and how map state syncs with the checklist. Use when map position is wrong, rotation doesn't match, or site switch loses data.
---

Complete reference for map coordinate alignment, drag behavior, site switching, and cross-tool sync.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "map not centered on lot", "rotation wrong after reload", "site switch loses buildings", "checklist out of sync")

## Map Coordinate Origin

The map centers on `state.lat, state.lng` — the pin the user placed during GIS intake.

- This point becomes `(0, 0)` in the local coordinate frame (Frame B)
- All building offsets, setback positions, and dim positions are relative to this point
- **NEVER move state.lat/lng without recalculating all dependent offsets**

## Rotation

`state.rotation` is the **geometric** lot rotation in degrees — controls the coordinate frame only.

**Where rotation is used:**
- MapEngine.render() — rotates lot polygon corners before converting to lat/lng
- SetbackEngine — all local frame math uses this angle
- Chain dimensions — text labels rotated to stay readable

**Setting rotation:**
- Rotation slider (0-360) in sidebar → fires `input` event → updates state → redraws
- Degree input box → same chain
- Both trigger `ExportEngine.save()` on change

## Site North (siteNorthDeg)

`state.siteNorthDeg` is a **reference-only bearing**, completely independent of `rotation`. Controls only the red SN arrow on the compass widget (bottom-left). Does NOT affect lot geometry, building positions, or any frame math.

**Use case:** Like a CAD north arrow — drag it to match the actual cardinal direction of the site's street frontage for drawings/exports/snapshots.

**Setting siteNorthDeg:**
- Drag the red SN arm on the compass like a clock hand
- Drag computes `atan2(dx, -dy)` from SVG center → 0–360° clockwise from true north
- On mouseup: `ExportEngine.save()` — persists in `saved.siteNorthDeg`

**Key separation:**
| Field | Controls |
|---|---|
| `rotation` | Lot polygon orientation, building frame, dim text angles — geometry |
| `siteNorthDeg` | Compass SN arrow only — reference annotation, never geometry |

## Drag Behavior

### Lot center drag (blue pin)
- MapEngine.attachEvents() creates draggable marker at `state.lat, state.lng`
- On drag: updates `state.lat`, `state.lng` to new position
- All buildings, setbacks, dims move with it (they're offsets from this origin)
- On dragend: calls `ExportEngine.save()`

### Building drag (numbered pins)
- MapEngine.createBuildingMarker(idx) creates per-building draggable markers
- On drag: converts marker lat/lng to local feet offset, then:
  1. MapEngine._applySnap() — magnetic snap to edges (8ft threshold)
  2. SetbackEngine._clampToLot() — constrain inside lot/setbacks
  3. Updates ConfigEngine.state.buildings[idx].offsetX/Y
  4. SetbackEngine.drawBuilding() — redraw footprint
  5. SetbackEngine.updateBldgDimLabels() — redraw dims
- On dragend: calls `ExportEngine.save()`
- Debounced save during drag (via `_saveTimer`) to avoid flooding

### Vehicle drag
- MapEngine.createVehicleMarker(idx) — same pattern as buildings
- Converts drag to local offsets, saves to ConfigEngine.state.vehicles[idx]

### Lock toggle
- When locked: drag marker disabled, rotation slider disabled
- Prevents accidental repositioning
- State: `ConfigEngine.state.locked` — persisted in save

## Site Switching

### Online mode (localhost)
1. User picks site from dropdown (populated from `__SITE_LIST__`)
2. `bootstrap.js.switchSite(siteId)` fires
3. Saves current site selection to localStorage: `selected_site`, `selected_state`
4. Clears `site_state` from localStorage (prevents stale data bleeding)
5. POST to `/api/sites/{siteId}/activate` — server updates pointer in `site-data.json`
6. Server rebuilds HTML with new site's data in `__SITE_DEFAULTS__`
7. `location.reload()` — fresh page load with new data

### Offline mode (file://)
- No server available — skips POST
- Reads from `__ALL_SITE_DATA__` (every site's full data injected at build time)
- Swaps `ConfigEngine.state` in memory from the selected site's data
- Re-renders without reload

### State filter
- Dropdown filters site list by state code (CA, WA)
- Purely UI filtering — doesn't affect data

## Checklist Sync

The InteractiveMap and PreApp_Checklist are two separate HTML files that share data through the build pipeline:

**Shared data path:**
```
data/sites/{site}.json
    ↓ build.py injects both as __SITE_DEFAULTS__
    ↓
InteractiveMap.html          PreApp_Checklist.html
(uses .saved for map)        (uses .site for zoning tables, fees)
```

**Checklist state save:**
- PreApp_Checklist stores its own state in localStorage under `preapp_*` keys
- When ExportEngine.save() runs (on the map page), it scans localStorage for `preapp_*` keys
- If found, appends as `.checklist` in the payload → saved to server JSON
- This way, checklist progress persists in the site JSON alongside map state

**Checklist backup:**
- POST `/backup-checklist` archives checklist JSON to `config/backup/`
- Separate from the main save flow

## Boot Sequence (How Map Initializes)

1. `ConfigEngine.init()` — loads from `__SITE_DEFAULTS__` (build-injected) or localStorage
2. `UIEngine.init()` — populates sidebar from ConfigEngine.data
3. `MapEngine.init()` — creates Leaflet map centered on state.lat/lng
4. `MapEngine.render()` — draws lot polygon, setback polygon, buildings
5. `SetbackEngine.initBuildingConfig()` — wires building sidebar controls
6. Vehicles restored if any exist
7. Toggle states (freeDrag, snapEdge) synced from saved config

## Common Issues

| Symptom | Cause | Check |
|---|---|---|
| Map centered on wrong location | state.lat/lng incorrect | Verify coordinates in site JSON |
| Map correct on first load, wrong after reload | localStorage has stale data from different site | Clear localStorage, check site_state key |
| Rotation doesn't match satellite | state.rotation not aligned to aerial | Re-align using rotation slider |
| Buildings disappear after site switch | site_state not cleared before reload | Check switchSite() clears localStorage |
| Checklist data missing after switch | preapp_* key from wrong site | Checklist keys not namespaced — known limitation |
| Drag not working | state.locked is true | Check lock toggle |
| Building snaps to wrong position | _applySnap threshold or extent mismatch | Check 8ft threshold in MapEngine._applySnap |

## Rules

- NEVER move state.lat/lng without recalculating all building offsets
- NEVER ingest GIS data (polygon vertices) without designer approval
- Site switching MUST clear localStorage to prevent cross-site data bleed
- Checklist sync is one-way: map save captures checklist state, not vice versa
- Lock toggle must disable BOTH drag marker AND rotation slider
