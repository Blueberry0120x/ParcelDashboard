---
name: engine-contract
description: Display the full engine contract — ownership boundaries, coordinate frames, change rules, and the 7 binding rules that prevent system drift. Use when planning changes or reviewing code.
---

Display the engine ownership contract for ProjectBook-Planner.

## The Problem This Solves

MapEngine and SetbackEngine share coordinate math. A "small change" in one engine's transform silently breaks the other. The system drifts because there is no single owner for geometry operations.

## 7 Binding Rules

1. **One engine, one responsibility.** If a function already exists in the ownership table, do NOT reimplement it in another engine. Call the existing function. Duplication is how drift starts.

2. **Frame B math stays in SetbackEngine.** Any calculation involving feet, distances, perpendicular measurements, extents, or building bounding boxes is SetbackEngine territory. MapEngine does not compute distances.

3. **Frame A conversion stays in MapEngine.** Any conversion from feet to lat/lng (or vice versa) is MapEngine territory. SetbackEngine does not know what latitude is.

4. **No "small fixes" that cross boundaries.** If a fix requires both Frame A and Frame B work, it is NOT a small fix. It crosses the boundary. State the boundary crossing explicitly before writing code.

5. **Test on 3 lots.** Any change to coordinate math or dimension drawing MUST be visually verified on: (1) a simple rectangle lot, (2) a rotated rectangle lot, and (3) a polygon lot. If it works on one but breaks another, the fix is wrong.

6. **ConfigEngine is passive.** ConfigEngine never calls other engines. It holds data. Other engines read from it and write to it. If ConfigEngine starts having import dependencies on MapEngine or SetbackEngine, the architecture is broken.

7. **ExportEngine.save() is the ONLY write path.** No engine may write to localStorage, POST to the server, or trigger a file download except through ExportEngine. Non-negotiable.

## Engine Roles (One Sentence Each)

| Engine | File | Role |
|---|---|---|
| ConfigEngine | engine-config.js | The filing cabinet — holds all state, never draws anything |
| MapEngine | engine-map.js | The drawing board — puts shapes on the map, converts ft to lat/lng |
| SetbackEngine | engine-setback.js | The architect's calculator — all geometry math, dims, extents, clamping |
| ExportEngine | engine-export.js | The save button — only write path, also LISP + image export |
| UIEngine | engine-ui.js | The label maker — sidebar text, runs once on boot |
| ElevationTool | engine-elevation.js | The level — USGS API sampling, totally independent |
| ResizeEngine | engine-resize.js | The drawer slide — sidebar resize divider |
| bootstrap.js | bootstrap.js | The foreman — boots all engines in order |

## Coordinate Frames

**Frame A (Geographic)** — MapEngine only
- Units: decimal degrees (WGS84)
- Origin: state.lat, state.lng (the pin)
- Used for: Leaflet polygons, markers, lat/lng display

**Frame B (Local Rotated)** — SetbackEngine only
- Units: feet from lot center
- Origin: (0,0) = lot center
- Axes: +X = toward rear, +Y = toward right side
- Used for: building offsets, setback distances, chain dim positions, extents, measurements

**Handoff:** SetbackEngine (Frame B feet) -> MapEngine converts -> Leaflet draws (Frame A lat/lng)

## Full Visual Reference

The complete contract with tables, diagrams, and debug cheat sheet is in:
`Output/architecture.html` -> "ENGINE CONTRACT" section

## Procedure

1. Read all 7 rules above
2. For specific operation lookup, use `/engine-lookup <operation>`
3. For debugging a symptom, use `/debug-symptom <what's broken>`
4. Print the relevant rules for the current task
