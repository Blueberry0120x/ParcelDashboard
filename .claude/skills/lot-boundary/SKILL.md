---
name: lot-boundary
description: How lot boundaries, setbacks, and building constraints work — rectangle vs polygon mode, setback zones, clamping, snapping. Use when lot shape is wrong, setbacks don't apply correctly, or buildings escape the boundary.
---

Complete reference for lot boundary rendering, setback enforcement, and building constraint logic.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "building escapes lot", "setback zone wrong shape", "polygon lot not rendering", "snap not working at edges")

## Two Lot Modes

### Rectangle Mode (default)
- Used when `parcelPolygon` is empty (`[]`)
- Lot drawn from `lotWidth` x `lotDepth` + `state.rotation`
- MapEngine.render() computes 4 corners with optional chamfer
- Simple, reliable — most lots use this

### Polygon Mode
- Used when `parcelPolygon` has vertex array: `[[lat1,lng1], [lat2,lng2], ...]`
- MapEngine.render() draws the polygon directly on Leaflet
- More complex — triggers KB-1/KB-2 bugs on irregular shapes
- Requires careful pin placement (state.lat/lng should be near centroid)

## Who Owns What

| Operation | Owner | Function |
|---|---|---|
| Draw lot boundary polygon | MapEngine | `render()` |
| Draw setback zone polygon | SetbackEngine | `drawSetbacks()` |
| Validate setback values | SetbackEngine | `applySetbacks()` |
| Clamp building inside lot | SetbackEngine | `_clampToLot()` |
| Snap building to edges | MapEngine | `_applySnap()` |
| Calculate building bounding box | SetbackEngine | `_buildingExtents()` |

## Lot Boundary Drawing (MapEngine.render)

**Rectangle mode:**
1. Half-dimensions: `hw = lotWidth/2`, `hd = lotDepth/2`
2. Four corners in local feet: `(-hd, -hw)`, `(-hd, +hw)`, `(+hd, +hw)`, `(+hd, -hw)`
3. Optional corner chamfer for non-square lots
4. Rotate each corner by `state.rotation` degrees
5. Convert from local feet to lat/lng using F_LAT, F_LNG
6. Create Leaflet polygon (red outline)

**Polygon mode:**
1. Read `parcelPolygon` array from ConfigEngine
2. Each vertex is already lat/lng — pass directly to Leaflet
3. Leaflet polygon drawn with same red outline style

## Setback Zone (SetbackEngine.drawSetbacks)

The setback zone is a smaller rectangle (or polygon) inside the lot boundary:
- Front setback pushes the front edge inward
- Rear setback pushes the rear edge inward
- Side L/R setbacks push the side edges inward
- Drawn as yellow dashed polygon on the map

**Validation in applySetbacks():**
- `front + rear < lotDepth` (must leave room)
- `sideL + sideR < lotWidth` (must leave room)
- Values stored in `ConfigEngine.state.setbacks`

**Commercial front:** When `commFront` is true, a commercial zone (blue polygon) is drawn at the front of the lot, depth = `commercialDepth` from site JSON.

## Building Clamping (SetbackEngine._clampToLot)

When a building is placed or dragged, `_clampToLot()` ensures it stays inside the lot:

1. Get building half-extents from `_buildingExtents()` (accounts for orientation rotation)
2. Calculate max allowable offset in each direction:
   - Max X = `lotHalfDepth - rearSetback - halfDepth` (can't exceed rear)
   - Min X = `-lotHalfDepth + frontSetback + halfDepth` (can't exceed front)
   - Same for Y with side setbacks
3. For stacked buildings (count > 1): includes ALL copies in the calculation
4. **For polygon lots:** scans polygon edges to find the constraint at each position

Returns clamped `(cx, cy)` — MapEngine applies these to the marker position.

## Building Snapping (MapEngine._applySnap)

`_applySnap(idx, offsetX, offsetY)` provides magnetic snap:
- **Threshold:** 8 ft — if a building edge is within 8ft of a lot edge, snap to it
- **Snap targets:** lot edges, polygon edges, other building edges
- Reads extents from `SetbackEngine._buildingExtents()`
- Does the snap calculation itself (MapEngine owns this)
- Returns snapped `(offsetX, offsetY)`

## Building Extents (SetbackEngine._buildingExtents)

Returns axis-aligned bounding box half-dimensions for a building:
- Accounts for building orientation (rotation relative to lot)
- `halfW` and `halfD` are the rotated bounding box halves
- Used by: `_clampToLot()`, `_applySnap()`, `updateBldgDimLabels()`, `drawBuilding()`

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Building escapes lot boundary | `_clampToLot()` not accounting for stacking | Check stack loop in _clampToLot |
| Setback zone doesn't match inputs | UI inputs not synced to state | Check save() UI sync step |
| Polygon lot shape wrong | Vertex order or coordinate format | Check parcelPolygon array — should be [[lat,lng],...] |
| Snap jumps to wrong edge | Threshold too large or wrong edge calculation | Check _applySnap threshold and edge detection |
| Building orientation doesn't match | _buildingExtents using wrong rotation | Check bldg.orientation vs state.rotation |
| Setback validation fails | front+rear >= lotDepth | Reduce values to leave room |

## Coordinate Frame Rules

- Lot boundary points: computed in Frame B (local feet), converted to Frame A (lat/lng) by MapEngine
- Setback zone: computed in Frame B by SetbackEngine, drawn by MapEngine after conversion
- Building clamping: entirely in Frame B (SetbackEngine)
- Building snapping: MapEngine converts drag position to Frame B offsets, calls snap, applies result
- NEVER do clamping or extent math in lat/lng — always work in local feet first
