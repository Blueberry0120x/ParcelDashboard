---
name: setback-dims
description: How setback dimension labels work — bold yellow measurements showing front/rear/side setback distances from lot boundary to setback zone. Use when setback dims are missing or wrong.
---

Reference for setback dimension labels — the bold yellow measurements.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "setback dims not showing", "wrong distance", "label in wrong position")

## Owner

**SetbackEngine** (`engine-setback.js`) — `drawSetbacks()` function.

## How It Works

### Rectangle Mode
For rectangle lots (no `parcelPolygon`), four setback dim lines are drawn:
- **Front (F):** from front lot edge to front setback line, at lot center Y
- **Rear (R):** from rear lot edge to rear setback line, at lot center Y
- **Side Left (SL):** from left lot edge to left setback line, at lot center X
- **Side Right (SR):** from right lot edge to right setback line, at lot center X

Each dim line is an orange dashed line (`#d97706`, weight 1.5, dash `4 3`) with a bold yellow label showing the distance in feet.

Dims with distance < 0.5 ft are skipped (no label for zero setbacks).

### Polygon Mode
For polygon lots, setback dims work differently:
- Each polygon edge is classified as front/rear/sideL/sideR by its outward normal direction
- A dim line is drawn from the boundary edge midpoint to the inset setback midpoint
- Only the **longest edge** per side gets a label (prevents stacking on multi-edge sides)
- Same bold yellow style

### Visual Style
CSS class: `.setback-dim-label`
```css
font-weight: 900;
color: #f6c90e;  /* bold yellow */
text-shadow: 0 0 4px #000, 0 0 4px #000, 1px 1px 3px #000, -1px -1px 3px #000;
```

### Lifecycle
- Created in `drawSetbacks()` — stored in `MapEngine.setbackDimLabels[]`
- Cleared at start of every `drawSetbacks()` call (remove all, rebuild)
- Redrawn on: setback input change, "Accept — Draw Setback Lines" click, page load

### Data Source
- Setback values: `ConfigEngine.state.setbacks` (front, rear, sideL, sideR)
- Lot dimensions: `ConfigEngine.data.width`, `ConfigEngine.data.depth`
- These are Frame B (local feet) values — `drawSetbacks()` converts to lat/lng via its own `transform()` function

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| No setback dims showing | Setback values are 0 | Enter non-zero setbacks and click "Accept" |
| Dims show but wrong distance | `.saved.setbacks` differs from `.site` setbacks | Sync saved setbacks from site zoning values |
| Label at wrong angle | Rotation transform issue | Check `lblAngle` calculation |
| Dims on polygon but not rectangle | Rectangle branch was missing | Added in current version — verify `drawSetbacks()` has both branches |
| Label overlapping building | Label placed at lot edge midpoint | Consider offsetting label position |

## Coordinate Frame
- All setback geometry computed in Frame B (local feet from lot center)
- Converted to Frame A (lat/lng) by `transform()` inside `drawSetbacks()` — this is a known Frame A violation in SetbackEngine (same pattern as `drawBuilding()`)
