---
name: save-flow
description: The complete save chain — from UI click through localStorage and server POST to JSON on disk. Use when save fails, values don't persist, or adding new state fields.
---

Trace the full save path from button click to persisted JSON.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "save not working", "field doesn't persist", "adding new save field", "server returns 500")

## Owner

**ExportEngine** (`engine-export.js`) — the ONE save function. No other engine writes to localStorage or POSTs to the server.

## The Save Chain (6 Steps)

### Step A: Sync UI inputs to ConfigEngine.state
`ExportEngine.save()` reads every active UI input and writes values into `ConfigEngine.state`:
- 4 setback inputs: `sb-front`, `sb-rear`, `sb-side-l`, `sb-side-r`
- Active building inputs: `bldgOrientInput`, `bldgW`, `bldgD`, `bldgOffsetX`, `bldgOffsetY`, `bldgCount`, `bldgStackSpacing`, `bldgStackAngle`, `bldgStories`, `bldgFloorHeight`
- Anchor mode: reads which of `anchorFront/Center/Rear` has `.active` class
- Commercial front toggle: `commFrontCheck.checked`
- MapEngine dim state: `showBldgDims`, `hiddenDimKeys`, `chainWOffset`, `chainDOffset`

**Why this step exists:** User may have typed into an input but not pressed Enter. The DOM has the value but ConfigEngine.state doesn't. This sync captures everything.

### Step B: Build payload via `_payload()`
Reads `ConfigEngine.state` and constructs the canonical save object:

```
{
  project: "ProjectBook-Planner",
  siteId: ConfigEngine.data.siteId,
  saved: {
    lat, lng, rotation, locked,
    setbacks: { front, rear, sideL, sideR },
    buildings: [...],
    activeBuilding,
    commFront, showBldgDims,
    hiddenDimKeys: [...],  // Set → Array
    chainWOffset, chainDOffset,
    mapOpacity,
    setbacksApplied,
    freeDrag, snapEdge,
    siteNorthDeg,     // compass SN arm bearing — independent of rotation
    vehicles: [...],
    activeVehicle
  }
}
```

If a `preapp_*` checklist key exists in localStorage, it's appended as `.checklist`.

**_payload() is the spec.** Every field that must survive reload MUST appear here.

### Step C: Write to localStorage
```javascript
localStorage.setItem('site_state', JSON.stringify(this._payload()))
```
- Synchronous, instant, offline-safe
- Single key `site_state` — not namespaced by site
- On next page load, `ConfigEngine.init()` reads this key first

### Step D: POST to dev server
Only if hostname is `localhost` or `127.0.0.1`:
```javascript
fetch('/save', { method: 'POST', body: JSON.stringify(payload) })
```
- Server uses `siteId` to find the target JSON file in `data/sites/`
- **Atomic write:** server writes to `.tmp` file, then renames over original
- Preserves `.site` key entirely — only overwrites `.saved`

### Step E: Server rebuilds HTML
After writing JSON, server calls `build()` to recompile both output files.
New `__SITE_DEFAULTS__` global reflects the updated `.saved` data.

### Step F: Flash badge
- Success: green "Saved" badge for 2 seconds
- Failure: red badge with error message for 4 seconds
- localStorage was already written in Step C — no data lost even on server error

## What Is NOT Saved

The `.site` key — all permanent parcel data (address, APN, zoning, FAR, fees). The live save path never touches it. To change `.site`, manually edit the JSON and rebuild.

## What Triggers save()

Every button/action that changes state calls `ExportEngine.save()`:
- Save Setbacks button
- Save Config button
- Save Boundary button
- FAB Save Config button
- Lock/Unlock toggle
- commFrontCheck toggle
- Building drag end
- Vehicle drag end
- Vehicle type/orientation change
- Reset button
- Rotation slider change
- Free drag / snap edge toggles
- Image export, LISP export, download config

## Adding a New Saved Field

1. Add to `_payload()` in engine-export.js (under `.saved`)
2. Add to `ConfigEngine.init()` — read from `SD.saved.newField` with fallback
3. In save() — add UI sync if the field has a DOM input
4. In the consuming engine — read from `ConfigEngine.state.newField`
5. Verify: change → save → reload → check value persists

## Debugging Save Issues

| Symptom | Check |
|---|---|
| Value doesn't persist after reload | Is it in `_payload()`? AND in `ConfigEngine.init()` restore? |
| Save flash doesn't appear | Check `#map-save-flash` element exists in DOM |
| Server returns 500 | Check terminal for Python error — usually JSON parse failure |
| Server returns 404 | `siteId` doesn't match any file in `data/sites/` |
| localStorage has value but page shows old data | `ConfigEngine.init()` may prefer `__SITE_DEFAULTS__` over localStorage — check priority |
| Checklist not saving | Check if `preapp_*` key exists in localStorage — checklist append is conditional |
| Save works on localhost but not file:// | POST /save skipped on file:// — only localStorage works |

## Rules

- ExportEngine.save() is the ONLY write path — no exceptions
- _payload() is the ONLY place that decides what gets saved
- .site is NEVER touched by save — manual edit + rebuild only
- Every new .saved field needs BOTH _payload() AND ConfigEngine.init()
- Atomic server write prevents corruption — never write directly to the JSON file
