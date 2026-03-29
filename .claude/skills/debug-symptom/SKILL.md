---
name: debug-symptom
description: Given a visual bug symptom, look up exactly which engine and function to investigate. Use when something looks wrong on the map or sidebar.
---

Given a symptom, identify exactly where to look.

## Arguments

- ARGUMENTS -- what is visually wrong

## Symptom Table

| Symptom | Engine | Function | File |
|---|---|---|---|
| Building position wrong | SetbackEngine | drawBuilding _clampToLot | engine-setback.js |
| Building size wrong | SetbackEngine | drawBuilding _buildingExtents | engine-setback.js |
| Dimension line wrong angle | SetbackEngine | updateBldgDimLabels | engine-setback.js |
| Dimension line wrong position | SetbackEngine | updateBldgDimLabels chainOffsets | engine-setback.js |
| Chain dims missing segments | SetbackEngine | updateBldgDimLabels hiddenDimKeys | engine-setback.js |
| Polygon lot dims wrong | SetbackEngine | polyExtentAt origin mismatch KB-1 | engine-setback.js |
| Lot boundary shape wrong | MapEngine | render | engine-map.js |
| Setback zone wrong | SetbackEngine | drawSetbacks | engine-setback.js |
| Snap not working | MapEngine | _applySnap | engine-map.js |
| Drag not responding | MapEngine | attachEvents | engine-map.js |
| Stacking layout wrong | SetbackEngine | drawBuilding stack loop | engine-setback.js |
| FAR density numbers wrong | SetbackEngine | updateFAR | engine-setback.js |
| Vehicle placement wrong | SetbackEngine | drawVehicles | engine-setback.js |
| Value not saving | ExportEngine | _payload missing field | engine-export.js |
| Value not restoring | ConfigEngine | init not loading field | engine-config.js |
| LISP coords wrong | ExportEngine | generateLISP | engine-export.js |
| Banner text wrong | UIEngine | init | engine-ui.js |
| Site switcher broken | bootstrap.js | switchSite | bootstrap.js |
| North arrow wrong | MapEngine | updateNorthArrow | engine-map.js |

## Known Bugs

- KB-1: Polygon extent uses wrong origin (centroid vs pin). El Cajon broken.
- KB-2: Witness lines cross property boundary. Depends on KB-1 fix.

## Rules

- Always read the actual function code before suggesting a fix
- Never fix a SetbackEngine symptom by modifying MapEngine or vice versa
- After any fix verify on 3 lot types: simple rect, rotated rect, polygon
