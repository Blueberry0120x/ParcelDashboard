# ProjectBook-Planner

Interactive parcel map and pre-application checklist suite for land development feasibility. Multi-site support (Euclid, Westminster, Burien).

## Output

- `Output/InteractiveMap.html` -- Leaflet map with draggable buildings, chain dimensions, setbacks, vehicle overlays
- `Output/PreApp_Checklist.html` -- Pre-application checklist with State Density Bonus calculator

## Structure

```
src/
  index.html              <- map dev shell
  checklist.html          <- checklist source (React, single-file)
  css/style.css           <- all CSS
  js/
    engine-config.js      <- ConfigEngine (state + site data)
    engine-ui.js          <- UIEngine (sidebar, info tables)
    engine-map.js         <- MapEngine (Leaflet, buildings, dims)
    engine-elevation.js   <- ElevationTool
    engine-setback.js     <- SetbackEngine + building config
    engine-export.js      <- ExportEngine (save/load/_payload)
    engine-resize.js      <- ResizeEngine
    bootstrap.js          <- window.onload
data/
  site-data.json          <- active site config (injected at build)
  sites/                  <- per-site JSON configs
Output/                   <- compiled single-file HTML (2 files)
Engine_InteractiveParcelMap.ps1  <- build script
```

## Build

```
powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1
```

## Dev Server

```
powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1 serve
```

Starts localhost:7734 with live save, site switching, and auto-rebuild.
