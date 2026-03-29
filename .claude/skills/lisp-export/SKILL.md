---
name: lisp-export
description: The full LISP export chain — from lot polygon on Leaflet through proj4 coordinate projection to AutoCAD-ready LISP script. Use when export coords are wrong, CAD zone is misconfigured, or adding export features.
---

Complete reference for the LISP export pipeline — GPS coordinates to AutoCAD survey feet.

## Arguments

- `$ARGUMENTS` — what's happening (e.g., "LISP coords wrong in AutoCAD", "proj4 projection error", "wrong CAD zone", "how to add building export")

## Owner

**ExportEngine** (`engine-export.js`) → `generateLISP()`

MapEngine provides the lot polygon vertices. ExportEngine does the projection and output.

## The Export Chain (5 Steps)

### Step 1: Get lot polygon vertices
```javascript
MapEngine.lotPoly.getLatLngs()[0]
```
- Returns array of Leaflet LatLng objects for every corner
- Rectangle lot: 4 points
- Polygon lot: N points (from parcelPolygon)
- These are in WGS84 decimal degrees (GPS coordinates)

### Step 2: Register proj4 projection
```javascript
proj4.defs(ConfigEngine.cad.projection, ConfigEngine.cad.proj4Def)
```
- `projection` = human-readable name like `"CA_VI_FT"`
- `proj4Def` = full PROJ.4 string for the State Plane zone
- Looked up from `ConfigEngine.CAD_SYSTEMS[cadZone]`

### Step 3: Project each vertex
```javascript
const [easting, northing] = proj4("WGS84", ConfigEngine.cad.projection, [pt.lng, pt.lat])
```
- Input: `[longitude, latitude]` — NOTE: proj4 takes lng FIRST, lat SECOND (opposite of Leaflet)
- Output: `[easting, northing]` in US survey feet (State Plane coordinates)
- These are real-world coordinates matching a licensed surveyor's boundary map

### Step 4: Format AutoLISP script
```lisp
; APN: 469-690-20-00
; Rotation: 142.5 deg
; Coord System: CA State Plane Zone VI (US Feet)
(command "_pline"
  "6291234.56,1832567.89"
  "6291284.56,1832567.89"
  "6291284.56,1832717.89"
  "6291234.56,1832717.89"
  "c"
)
(command "_zoom" "e")
(princ "\nBoundary drawn successfully.")
```
- Each vertex as `"easting,northing"` string — AutoCAD's pline accepts this format
- `"c"` closes the polyline (connects last vertex to first)
- `_zoom e` zooms to extents to show the boundary
- Header comments record APN, rotation, and coordinate system for traceability

### Step 5: Deliver output
- LISP text placed in `#outputCoords` textarea for copy
- State snapshot saved to `localStorage['last_lisp_export']`
- `ExportEngine.save()` fires to persist current map state
- JSON file downloaded as `site-calibration_{APN}.json` with full state snapshot

## CAD Coordinate Systems

Configured in `ConfigEngine.CAD_SYSTEMS`:

| Code | Zone | Area |
|---|---|---|
| CA_VI | California State Plane Zone VI | San Diego, Imperial counties |
| CA_V | California State Plane Zone V | Los Angeles, Orange, San Bernardino |
| CA_IV | California State Plane Zone IV | Santa Barbara, San Luis Obispo |
| CA_III | California State Plane Zone III | Central California |
| WA_N | Washington State Plane North | Seattle, King County |
| WA_S | Washington State Plane South | Olympia, Thurston County |

**Setting the CAD zone:**
- Dropdown in sidebar populated from `CAD_SYSTEMS` (filtered by state)
- Auto-detected from address in `ConfigEngine._detectCadZone()`
- Stored in `ConfigEngine.data.cadZone`
- Saved on change via `ExportEngine.save()`

## Accuracy Dependencies

The LISP coordinates are only as accurate as:

1. **Lot polygon vertices** — For rectangle lots, derived from lotWidth x lotDepth + rotation + lat/lng. For polygon lots, from GIS-sourced parcelPolygon array.
2. **Pin position** (state.lat, state.lng) — determines absolute coordinate position. Error here shifts the entire boundary in AutoCAD.
3. **Rotation angle** (state.rotation) — determines boundary orientation. Error here rotates the boundary around the pin point.
4. **CAD zone selection** — wrong zone = coordinates in wrong State Plane = boundary lands miles away in AutoCAD.

## Pasting into AutoCAD

1. Open AutoCAD
2. Type `APPLOAD` or open command line
3. Paste the LISP text from the textarea (or load the downloaded .lsp file)
4. AutoCAD draws the closed polyline at State Plane coordinates
5. Corners should match the parcel corners on any licensed survey for this site

## Common Issues

| Symptom | Cause | Fix |
|---|---|---|
| Boundary lands miles away in CAD | Wrong CAD zone selected | Check cadZone matches the site's jurisdiction |
| Boundary rotated in CAD vs satellite | state.rotation not aligned to aerial | Re-align rotation slider to match satellite imagery |
| Boundary offset from survey | state.lat/lng not precisely on lot center | Re-center pin using Google Maps coordinates |
| proj4 error in console | CAD zone not registered | Check ConfigEngine.CAD_SYSTEMS has the zone definition |
| Textarea empty after export | lotPoly has no vertices | Check MapEngine.lotPoly exists and render() ran |
| JSON download missing fields | _payload() not capturing all state | Check ExportEngine._payload() |
| Vertices in wrong order in CAD | Leaflet returns CCW, AutoCAD expects CW | Reverse array if needed — check pline close behavior |

## Rules

- proj4 takes `[lng, lat]` — NOT `[lat, lng]` like Leaflet
- ExportEngine owns ALL proj4 calls for CAD export
- MapEngine provides lotPoly vertices — ExportEngine does NOT compute its own polygon
- The calibration JSON download is a portable record — include all relevant state
- LISP export always fires save() to persist the current map state
