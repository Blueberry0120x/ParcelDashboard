# ProjectBook-Planner

Interactive planning tool with AutoLISP export for 4335 Euclid Ave.

## Structure

```
src/
  index.html              <- dev shell (open with Live Server)
  css/style.css           <- all CSS
  js/
    engine-config.js      <- ConfigEngine
    engine-ui.js          <- UIEngine
    engine-map.js         <- MapEngine
    engine-elevation.js   <- ElevationTool
    engine-setback.js     <- SetbackEngine + building config
    engine-export.js      <- ExportEngine
    engine-resize.js      <- ResizeEngine
    bootstrap.js          <- window.onload
data/
  site-data.json          <- saved site settings (injected at build)
exports/                  <- LISP/JSON export output
InteractiveMap.html       <- compiled single-file output
Engine_InteractiveParcelMap.cmd  <- build entry point
Engine_InteractiveParcelMap.ps1  <- build script
```

## Build

Double-click `Engine_InteractiveParcelMap.cmd` or run:

```
powershell -ExecutionPolicy Bypass -File Engine_InteractiveParcelMap.ps1
```

## Dev

Open `src/index.html` with VS Code Live Server for hot reload.
