# Engine_InteractiveParcelMap — Project Rules

## -- CONTROLLER AUTHORITY -------------------------------------------------------
This project is managed by the **NP_ClaudeAgent Controller**
(`Blueberry0120x/NP_ClaudeAgent`). The Controller may make changes to this repo
remotely (via GitHub API or direct file edits) for:
- Standards enforcement (CLAUDE.md baseline sections)
- Cross-repo sync (global rules, compliance checks)
- Build/deploy commands
- UI updates coordinated across the suite

If you see changes not made in this session, check the Controller's commit log.
Any Claude agent working in this project should respect global rules from the
Controller. Project-specific rules below take precedence for domain logic only.
n### Where to check
- Controller repo: `Blueberry0120x/NP_ClaudeAgent`
- Compliance reports: `report/ctrl004_baseline_push_*.md`
- Inspection reports: `report/inspection_*.md`
- Global rules: `report/global_rules_2026-03-15.md`
- Build plan: `report/supervisor_build_plan_*.md`
### Controller DispatchWhen the user says **"controller dispatch"** or **"check with controller"**,read the latest dispatch notes below and execute the pending tasks.**Completion protocol:**- After completing each task, commit with prefix `[DISPATCH-DONE]`- After ALL tasks done, add a summary to this section under **Completed:**  with the date and what was done- The Controller will verify by scanning for `[DISPATCH-DONE]` commits  and reading the changes. Once verified, the Controller clears the dispatch.**Pending dispatch:** None

### Changes from Controller (2026-03-20)
- Suite bar button colors: ParcelQuest=amber, SanDag GIS=sky, PermitFinder=rose
- Per-building independent Y offset confirmed working (offsetX chained, offsetY free)
- Added "Free Drag" button — toggles X-axis chaining off, allows free placement
- Added "Snap Edge" button — snaps active building bottom edge to nearest building
- Fixed "x Del" to delete the selected building tab, not just the last one

## ── CANONICAL SAVE ARCHITECTURE ──────────────────────────────────────────────

**`ExportEngine._payload()` is the single source of truth for all persisted state.**

Every field that must survive across sessions MUST appear in `_payload()`.
No save path — localStorage, server POST, or JSON download — may define its
own field list. They all read from `_payload()`.

### Checklist: adding a new state field
1. Add the field to `_payload()` first
2. Add it to `ConfigEngine.init()` so it loads from `window.__SITE_DEFAULTS__`
3. Add it to the relevant restore block (e.g. `initBuildingConfig()`)
4. If it has a UI element, make sure the element syncs on load

### Fields currently in `_payload()` (keep in sync)
```
lat, lng, rotation, locked, setbacks,
buildings, activeBuilding, commFront, showBldgDims,
hiddenDimKeys, chainWOffset, chainDOffset, mapOpacity,
setbacksApplied, vehicles, activeVehicle
```

### Save trigger rules
Every action that mutates persisted state MUST call `ExportEngine.save()`.
`save()` is the ONE function -- it syncs UI inputs to state, writes ONE
localStorage key (`site_state`), pushes to dev server, and shows the flash badge.

All save buttons already call it:
- Save Setbacks, Save Config, Save Boundary, Save to File, FAB Save Config
- Lock/Unlock toggle, commFrontCheck toggle, reset(), drag-end handlers

To add a new save trigger: just call `ExportEngine.save()`. Nothing else needed.

## ── CSS RULES ─────────────────────────────────────────────────────────────────
- Before adding any CSS rule, search the file for the selector first.
- Never duplicate a selector block — extend the existing one.
- SVG stroke properties: use CSS class overrides (e.g. `.chain-dim-line`),
  NOT `stroke-width` in CSS if it would kill the Leaflet hit area.
  Leaflet's `weight` option sets the SVG attribute; CSS `stroke-width`
  overrides it for pointer events. Keep CSS stroke-width ≥ Leaflet weight
  or omit it entirely.

## ── STATE SYNC RULES ──────────────────────────────────────────────────────────
- When a toggle or control forces another control's state (e.g. dim drag
  toggle forces showBldgDims = true), ALWAYS update the related UI element
  (button text, class) at the same time.
- Dead code: when a design changes (e.g. individual dims → chain dims),
  remove unused helpers immediately — don't leave them for cleanup later.

## ── SITE-DATA.JSON ARCHITECTURE ───────────────────────────────────────────────

`data/site-data.json` has TWO top-level keys with different lifecycles:

| Key     | What it holds                         | Written by          |
|---------|---------------------------------------|---------------------|
| `site`  | Static project identity (address, APN, zoning rules, fees, contacts) | You, manually       |
| `saved` | Session state (lat, lng, buildings, …) | `ExportEngine._payload()` via pushToServer() |

At build time, PS1 merges both into `window.__SITE_DEFAULTS__` (injected into
ALL suite files — InteractiveMap AND PreApp_Checklist).

**POST /save preserves `site`** — the save handler reads the existing file,
keeps `site`, and overwrites only `saved`.

### Site identity fields (in `site` key — NOT in `_payload()`)
```
address, apn, zoning, lotWidth, lotDepth, lotSF, commercialDepth,
baseFAR, commFAR, maxHeight, baseHeightLimit, cchsMaxHeight,
frontSetback, rearSetback, sideSetback, densityPerSF,
nefRatePerSF, affordabilityPct, difPerUnit, difWaiverSF,
inspectors[]
```

### Adding a new site identity field
1. Add it to `data/site-data.json.site`
2. Consume from `SD = window.__SITE_DEFAULTS__` with a fallback
3. In `engine-config.js.init()` if it drives ConfigEngine.data

## ── BUILD PIPELINE ────────────────────────────────────────────────────────────
- Source files live in `src/`; compiled output is `Output/InteractiveMap.html` + `Output/PreApp_Checklist.html`
- Build: run `Engine_InteractiveParcelMap.ps1` (compile only)
- Dev server: run with `serve` argument → localhost:7734
  - GET `/`          → serves InteractiveMap.html
  - GET `/checklist` → serves PreApp_Checklist.html
  - POST `/save`     → writes site-data.json (preserving site key) + rebuilds both
- `data/site-data.json` is the on-disk state file; merged into
  `window.__SITE_DEFAULTS__` at build time via `Get-InjectScript`
- Em dashes and non-ASCII in PS1 string literals cause cp1252 parse errors —
  use plain ASCII hyphens only in PS1 files
