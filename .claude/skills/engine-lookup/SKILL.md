---
name: engine-lookup
description: Look up which engine owns a specific operation before writing code. Use BEFORE modifying any geometry, dimension, save, drag, or UI code. Prevents cross-engine drift.
---

Before writing or modifying code, look up which engine owns the operation.

## Arguments

- `$ARGUMENTS` — what you are about to do (e.g., "fix dimension line angle", "add new building field", "change snap threshold")

## Ownership Table

| Operation | Owner ONLY | Key Function |
|---|---|---|
| Store/read any mutable state | ConfigEngine | `.state`, `.data` |
| Create/destroy Leaflet layers | MapEngine | `map.addLayer()`, `layer.remove()` |
| Draw lot boundary polygon | MapEngine | `render()` |
| Convert local ft to lat/lng | MapEngine | rotation transform in `render()` |
| Convert lat/lng to local ft | MapEngine | inverse rotation |
| Handle ALL drag events | MapEngine | `attachEvents()` |
| Snap building to edges | MapEngine | `_applySnap()` |
| Calculate building extents (bounding box) | SetbackEngine | `_buildingExtents()` |
| Clamp building inside lot | SetbackEngine | `_clampToLot()` |
| Draw ALL dimension lines (lot + building + chain) | SetbackEngine | `updateBldgDimLabels()` |
| Calculate perpendicular measurements | SetbackEngine | chain math in `updateBldgDimLabels()` |
| Validate setback rules | SetbackEngine | `applySetbacks()` |
| Stack building copies (count, spacing, angle) | SetbackEngine | `drawBuilding()` |
| Calculate FAR / density / height | SetbackEngine | `updateFAR()` |
| Draw setback zone polygon | SetbackEngine | `drawSetbacks()` |
| Draw vehicle footprints | SetbackEngine | `drawVehicles()` |
| Write to localStorage | ExportEngine | `save()` |
| POST to server | ExportEngine | `save()` -> `_pushToServer()` |
| Build canonical save payload | ExportEngine | `_payload()` |
| Project to CAD State Plane | ExportEngine | `generateLISP()` |
| Export PNG screenshot | ExportEngine | `exportImage()` |
| Populate sidebar text/tables | UIEngine | `init()` |
| Edit site metadata modal | UIEngine | `openSiteEditor()` |
| Sample elevation from USGS | ElevationTool | `_fetch()`, `_onClick()` |
| Resize sidebar column | ResizeEngine | `init()` |

## Two Coordinate Frames

- **Frame A (Geographic):** lat/lng decimal degrees. Owner: MapEngine ONLY.
  - Origin: `state.lat, state.lng` (the pin)
  - Scale: F_LAT = 364,566 ft/deg, F_LNG = 365,228 * cos(lat) ft/deg
  - Conversion: `rx = px*cos(rot) - py*sin(rot)`, `ry = px*sin(rot) + py*cos(rot)`, then `[lat + ry/F_LAT, lng + rx/F_LNG]`

- **Frame B (Local Rotated):** feet from lot center. Owner: SetbackEngine.
  - Origin: (0,0) = lot center = same point as state.lat/lng
  - Axes: +X = toward rear, +Y = toward right side
  - All building offsets, setback distances, chain dim positions, extents are in this frame

**Handoff protocol:** SetbackEngine computes in Frame B (feet) -> returns values -> MapEngine converts to Frame A (lat/lng) -> draws on Leaflet. NEVER reverse this.

## Procedure

1. Read $ARGUMENTS — what is about to change
2. Find the operation in the ownership table above
3. Identify the owning engine and key function
4. **Output:** State which engine owns this, which function to modify, and which coordinate frame applies
5. If the change crosses a frame boundary (needs both Frame A and Frame B work), say so explicitly — this is NOT a small fix
6. If the operation is not in the table, flag it as a new capability that needs an ownership assignment before coding

## Rules

- NEVER reimplement a function that exists in the owning engine — call the existing one
- NEVER do Frame B math (distances, extents, perpendicular) in MapEngine
- NEVER do Frame A conversion (ft to lat/lng) in SetbackEngine
- ConfigEngine is passive — it NEVER imports or calls other engines
- ExportEngine.save() is the ONLY write path — no exceptions
- After any coord/dim change, test on 3 lot types: simple rect, rotated rect, polygon
