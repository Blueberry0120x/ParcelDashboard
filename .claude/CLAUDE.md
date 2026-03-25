# ProjectBook-Planner

## Controller Authority

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

### Where to check
- Controller repo: `Blueberry0120x/NP_ClaudeAgent`
- Compliance reports: `report/ctrl004_baseline_push_*.md`
- Inspection reports: `report/inspection_*.md`
- Global rules: `report/global_rules_2026-03-15.md`
- Build plan: `report/supervisor_build_plan_*.md`

### Controller-Note Protocol (auto-notify)
- **Upnote file:** `controller-note/ProjectBook-Planner-upnote.md` — single rolling file, newest entries at top
- **Auto-notify:** `.github/workflows/notify-controller.yml` fires a `repository_dispatch` event (`upnote-updated`) to `NP_ClaudeAgent` whenever `controller-note/**` changes on push to main
- **On session start:** Always check `controller-note/` for `controller-upnote*.md` files from controller. Compare timestamps — if newer than last upnote entry, read and sync.
- **On changes:** Always append to the rolling upnote before committing. No separate files per update.
- **Mirror child:** ParcelDashboard (`Blueberry0120x/ParcelDashboard`) is owned by this agent. Full control authorized by user-designer. No controller approval needed.

### Controller Dispatch
When the user says **"controller dispatch"** or **"check with controller"**,
read the latest dispatch notes below and execute the pending tasks.

**Completion protocol:**
- After completing each task, commit with prefix `[DISPATCH-DONE]`
- After ALL tasks done, add a summary to this section under **Completed:**
  with the date and what was done
- The Controller will verify by scanning for `[DISPATCH-DONE]` commits
  and reading the changes. Once verified, the Controller clears the dispatch.

**Pending dispatch (2026-03-25):**
- [x] **GLOBAL-001:** Fill in Project Goal
- [x] **GLOBAL-008:** Fill in Safety Contract
- [x] **GLOBAL-007:** Fill in Handoff Notes
- [x] **GLOBAL-010:** Add `Set-StrictMode -Version Latest` to PS1 files
- [x] **GLOBAL-022:** Dev-Check section already present in CLAUDE.md
- [x] **GLOBAL-016:** Created `UserPref.json` at project root
- [x] Committed with `[DISPATCH-DONE]` prefix

**Completed (2026-03-25):**
- All 6 GLOBAL dispatch items resolved
- Added `report/` folder with `.gitkeep` (controller action item #2)
- `.gitignore` already existed (controller action item #1 was pre-done)

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
# Wrapper fields (outside `saved`)
project, siteId

# Inside `saved`
lat, lng, rotation, locked, setbacks,
buildings, activeBuilding, commFront, showBldgDims,
hiddenDimKeys, chainWOffset, chainDOffset, mapOpacity,
setbacksApplied, freeDrag, snapEdge, vehicles, activeVehicle

# Conditional (appended if present in localStorage)
checklist
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

## Project Goal

Interactive parcel map and pre-application checklist suite for land development feasibility. Builds site-specific zoning dashboards (setbacks, FAR, density, fees) on a Leaflet map with draggable buildings, chain dimensions, and vehicle turn templates. Compiles to two standalone HTML files (InteractiveMap + PreApp_Checklist) from modular JS/CSS sources via a PowerShell build pipeline.


## File Encoding

All source files: UTF-8, no BOM. See GLOBAL-002 in the global rules registry.


## Branch Naming

Follow GLOBAL-003: `main`, `feature/{topic}`, `fix/{topic}`, `claude/{topic}-dev{N}`.


## Completion Protocol

Before declaring any task complete:
1. Run the project test suite or verification script
2. Verify zero errors in output
3. If either fails, fix the issue. Do NOT mark done until all pass.


## Safety Contract

- **Read-only:** `data/site-data.json` (`.site` key), `data/sites/*.json`, `src/**`, `reference/**`
- **Writable:** `Output/InteractiveMap.html`, `Output/PreApp_Checklist.html`, `data/site-data.json` (`.saved` key only, via POST /save), `controller-note/`, `report/`, `UserPref.json`


## Handoff Notes (last updated 2026-03-25)

### What was completed this session
- Westminster multi-site support: R-3 zoning config, state bleed fix, falsy-zero guards, dynamic info tables
- Corner visibility chamfer, compass direction fix, rotation 0-360 normalization
- Responsive merge: 4 HTML files consolidated to 2 (Mobile variants removed)
- Controller dispatch: filled baseline sections (Project Goal, Safety Contract, Handoff Notes), added StrictMode to PS1 files, created report/ and UserPref.json

### What still needs work
- Public/private config sync (Reboot Public / Pull from Public endpoints) -- architecture approved by controller, not yet implemented
- Public/private config sync endpoints (Reboot Public / Pull from Public)
- Test coverage: zero automated tests currently

### Known issues
- `data/site-data.json` contains real addresses/APNs/inspector names (PII -- accepted risk per controller)
- `data/site-data.json` contains real addresses/APNs/inspector names (PII concern flagged by controller)


## Dev-Check Quality Gate (CTRL-007)

Before any milestone commit or PR merge, run a multi-persona quality review:
- Minimum 10 consecutive clean rounds to pass
- Covers: architecture, security, UX, performance, accessibility
- Fix all critical/high findings before committing
- Log the dev-check result in `report/`


## Controller-Note Protocol (CTRL-005)

### Session Start (BLOCKING)

Before ANY other work, check for unread pings:
1. Compare `controller-note/.ping` mtime vs `controller-note/.last-read` mtime
2. If `.ping` is newer — there is unread content
3. Announce to user: "New ping from controller — reading now"
4. Read `controller-note/controller-upnote.md`
5. Update `controller-note/.last-read`
6. Respond if needed

This is a BLOCKING prerequisite — no work until pings are checked.

### Mid-Session Re-Scan

After every major task (commit, baseline push, feature merge), re-check `.ping` before proceeding.

### On Change: Write Upnote + Ping

When making changes that affect cross-repo state:
1. Append entry to `controller-note/{repo_name}-upnote.md`
2. Touch `controller-note/.ping`

