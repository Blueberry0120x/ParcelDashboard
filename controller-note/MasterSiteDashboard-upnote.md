# MasterSiteDashboard -- Agent Upnote

> Single rolling note. Newest entries at top. Controller: check this file first.
> Format: `## [YYYY-MM-DD HH:MM] Topic` per entry. Mark resolved items with ~~strikethrough~~.

---

## [2026-03-25 01:30] ACTION DIRECTIVE FOR CONTROLLER -- RESPONSE REQUIRED

**Priority: HIGH. Planner agent is blocked on items 1 and 5 until controller responds.**

### Directive 1: RENAME DECISION -- BLOCKING
GitHub already redirects `MasterSiteDashboard.git` to `ProjectBook-Planner.git` (confirmed on push). Internal references are split:
- CLAUDE.md header: `ProjectBook-Planner` (updated)
- Upnote filename: `MasterSiteDashboard-upnote.md` (old)
- Workflow dispatch payload: `MasterSiteDashboard` (old)
- Controller upnote header: references both names

**Confirm canonical name = `ProjectBook-Planner`?** If yes, Planner agent will rename all internal references. If no, specify the canonical name.

### Directive 2: FIX `launch_configs.json` -- CONTROLLER SIDE
2 phantom `_Mobile.html` entries still listed. Deleted in commit `5118856` (responsive merge, Mar 22). CTRL-006 verification will fail until fixed.

### Directive 3: REGISTER ParcelDashboard AS CHILD -- CONTROLLER SIDE
Acknowledged in `[2026-03-22 14:35]` upnote. Still pending in global rules. Full control authorized by user-designer.

### Directive 4: IMPLEMENT `repository_dispatch` LISTENER -- CONTROLLER SIDE
`notify-controller.yml` fires `upnote-updated` to NP_ClaudeAgent. Acknowledged `[2026-03-22 14:35]`. Still pending. Without this, controller only reads upnotes on manual scan.

### Directive 5: UPDATE CROSS-REPO REFERENCES -- BLOCKING ON #1
Any global rules, launch configs, or repo-sync entries still pointing to `MasterSiteDashboard` need updating after rename decision.

### Directive 6: PII RISK ACKNOWLEDGMENT -- ADVISORY
`data/site-data.json` has real addresses, APNs, inspector names. Mirror scrubs for public. Private repo has plaintext. Document as accepted risk or request mitigation.

### Dispatch Completion Confirmation
All 6 GLOBAL items from 2026-03-25 dispatch are done. Commit `1a30da2` tagged `[DISPATCH-DONE]`. Controller can verify and clear the dispatch.

**Planner agent status: IDLE, awaiting controller response on directives 1-5.**

---

## [2026-03-25 01:00] FULL PROJECT HISTORY: Every step that led to the current state

This is a comprehensive chronological record of how ProjectBook-Planner (aka MasterSiteDashboard) evolved from initial commit to its current state. Written for the Controller to have full context.

---

### Phase 1: Foundation (2026-03-13)

**Initial build-out of the interactive parcel map for the Euclid Ave site.**

1. `42df1b6` (Mar 13) -- **Project genesis.** Initial files: README, config, stylesheets. The idea: an interactive Leaflet map for land development feasibility analysis.
2. `9941a21` (Mar 13) -- WIP save of early prototyping.
3. `518e165` (Mar 13) -- **v7: First real feature set.** Concept design panel, setback engine, north compass (SVG with True North + Site North), draggable banner, resizable sidebar/map split, USGS topo basemap, legacy data accordions. This commit established the core UI paradigm that still exists.
4. `4e2229c` (Mar 13) -- **v8: UI refinement.** Pill toggle buttons, black labels, grid banner, 5-accordion info grid, modern transparent compass overlay.
5. `8e38533` (Mar 13) -- Merged the best build into `InteractiveMap.html` + created `legacy.html` for reference.
6. `ee515e6` - `03f77b0` (Mar 13) -- Series of dev2 iterations: sidebar tool alignment, inline toggles, banner legibility, fixed-height map, column alignment, banner drag ghost fix.

**Result:** A working single-page Leaflet map with property info sidebar, setback visualization, and compass overlay. Euclid Ave hardcoded.

---

### Phase 2: Modular Architecture + Build Pipeline (2026-03-14)

**Split the monolith into engines, added the PowerShell build pipeline.**

7. `35d45ff` (Mar 14) -- **Monolith split.** Single HTML broken into modular engine files under `src/`: `engine-map.js`, `engine-config.js`, `engine-setback.js`, `engine-ui.js`, `engine-export.js`, plus `style.css` and `index.html`. PowerShell build script (`Engine_InteractiveParcelMap.ps1`) concatenates them back into a single HTML at build time.
8. `4d88c86` - `0b956d2` (Mar 14) -- UI polish: Save Boundary fix, header APN cell, flattened project to root, single build entry point, layout improvements, address/APN header display.
9. `17a0137` (Mar 14) -- Elevation tool added, map layer cleanup, header pair layout.
10. `373617b` (Mar 14) -- **Building configuration panel.** First building config UI: width, depth, stories, offset inputs. Save setbacks functionality.
11. `3ac168b` (Mar 14) -- Building offset inputs + drag pin (click map to reposition building).
12. `43cf707` - `de02f46` (Mar 14) -- **Concept design engine.** Multi-building support, story count, spacing controls, FAR calculation + check, footprint area badges, Total Area, anchor control. Iterative polish on units, fonts, labels.
13. `14943ff` - `48d15cf` (Mar 14) -- Banner + table polish. FAR Base/Comm display, lot acreage, cell padding, spacing slider positioning.
14. `6c33112` (Mar 14) -- **Per-building independent offsets with tab selector.** Each building gets its own offset controls, switched via tabs.
15. `419d197` - `15cff51` (Mar 14) -- Spacing field, per-building stack (N copies, G gap, anchor), grid layout fixes.
16. `a232846` - `85fdcdd` (Mar 14) -- Value display alignment, Save Boundary rename, Lock Position toggle, angle input alignment.

**Result:** Modular codebase with PS1 build pipeline. Multi-building concept design with per-building offsets, FAR checks, and stack copies. Tab-based building selector.

---

### Phase 3: Dimension System (2026-03-16 - 2026-03-17)

**Chain dimensions, click-to-hide, clearance dims, lot boundary dims.**

17. `cc381b8` (Mar 16) -- Building config and alignment enhancements.
18. `30527d4` - `91741d7` (Mar 16) -- **Site settings injection from `site-data.json`.** Save to File functionality. Map rendering now respects `commFront` (commercial frontage) state.
19. `c60cc43` (Mar 16) -- **7-bug fix pass** (verified 3 clean rounds). Consolidated Show Dims button.
20. `3a1b448` - `96aefea` (Mar 16) -- Dim label styling: removed pill styling, split lines around text, center labels, click-to-hide lot dims.
21. `4bcace3` (Mar 16) -- **Modular build architecture** refactor (build script improvements).
22. `843507e` - `bc66212` (Mar 16) -- **Clearance dimensions.** Proper dim lines between buildings and setback lines, clickable to hide, 0ft threshold, comm hatch logic.
23. `d3928ca` (Mar 16) -- Persist click-to-hide state across redraws.
24. `e2c6c89` (Mar 16) -- **Lot boundary dimension lines** + click-to-hide on all dim types.
25. `8481c94` - `fc3c46c` (Mar 17) -- Dim label orientation fixes: stay horizontal/vertical, follow line direction, snap to 0 or -90 deg.
26. `053999e` - `727dd02` (Mar 17) -- Build script sync to `src/` paths, removed redundant `build/` folder, cleaned archive/empty dirs/stale files.
27. `1defc75` (Mar 17) -- **Chain dimensions with draggable repositioning.** Dimensions chain between buildings (W offset, D offset) instead of individual per-building dims. Labels are draggable.
28. `54ce304` (Mar 17) -- Dimension labels toggle, rendering logic tied to commFront state.

**Result:** Full dimension system: lot boundary dims, building clearance dims, chain dims between buildings. All click-to-hide, persisted across redraws. Draggable chain dim labels.

---

### Phase 4: Save Architecture + Checklist Suite (2026-03-17 - 2026-03-18)

**Canonical save, site-data.json as single source of truth, PreApp Checklist.**

29. `5cfc5ee` (Mar 17) -- **Canonical save architecture.** `ExportEngine._payload()` established as the single source of truth for all persisted state. All save paths (localStorage, server POST, file download) read from `_payload()`. This is still the governing architecture.
30. `11748c5` (Mar 17) -- Consolidated output to `Output/` folder. **Added PreApp_Checklist to the suite.** Now two HTML outputs.
31. `e29bc28` (Mar 17) -- **`site-data.json` as single source of truth** for both Map and Checklist. Two top-level keys: `site` (static project identity) and `saved` (session state from `_payload()`). Build pipeline injects both as `window.__SITE_DEFAULTS__`.
32. `79b631b` (Mar 18) -- **Map-to-checklist sync** via `site-data.json`. Changes saved on the map are picked up by the checklist on rebuild.
33. `ccfca36` (Mar 18) -- Zoning code library, regulation PDFs, checklist glossary.
34. `f63a70f` (Mar 18) -- Checklist UX: green checked state, print/PDF FAB, JSON auto-backup.
35. `098dbb6` (Mar 18) -- **State Density Bonus pathway.** Live calculator + map density check overlay.
36. `c08aba0` (Mar 18) -- Mobile responsive layout (first pass), map print/save flash badge.
37. `980f0ad` (Mar 18) -- Consolidated save architecture fixes, density check + SDB auto-setback.
38. `41dba2c` (Mar 18) -- **50-pass audit fixes.** Height formula, FAR config, opacity, zoom fonts. Comprehensive quality sweep.
39. `e0ef90a` (Mar 18) -- Added Claude Code config and mobilize skill.
40. `5257344` (Mar 18) -- **Vehicle overlay placement** + PermitFinder suite link in the toolbar.
41. `1de1985` (Mar 18) -- PermitFinder dropdown: By Map + By Database options.

**Result:** Two-file suite (InteractiveMap + PreApp_Checklist) sharing `site-data.json`. Canonical save architecture. State Density Bonus calculator. Vehicle overlays. Suite bar with external tool links.

---

### Phase 5: Controller Integration + Mirror Workflow (2026-03-20 - 2026-03-22)

**Controller authority established. GitHub Pages mirror. Dark mode. Responsive merge.**

42. `76eaaa8` (Mar 20) -- **Controller Authority added to CLAUDE.md.** Suite bar button colors updated per controller directive (ParcelQuest=amber, SanDag=sky, PermitFinder=rose).
43. `87d7e88` - `7ba0c1e` (Mar 20) -- Moved `CLAUDE.md` into `.claude/` folder (standard structure).
44. `cb7859b` (Mar 20) -- **Free Drag + Snap Edge modes.** Free Drag toggles X-axis chaining off; Snap Edge snaps buildings to nearest edge. Fixed delete-active-building bug.
45. `2ab4087` - `c6fc3cd` (Mar 20-21) -- Controller reference links and dispatch protocol added to CLAUDE.md.
46. `f5bdaa0` - `31d64e8` (Mar 22, via PR #2) -- Synced `_payload()` field list, added iPhone mobile versions (separate files), restored site-data.json site key, serve mode in Python build script, `docs/` folder for GitHub Pages.
47. `776b6b8` (Mar 22) -- **Merged PR #2** (Copilot-created branch for docs/Pages deployment).
48. `27bb154` - `72568bf` (Mar 22) -- **GitHub Actions mirror workflow.** Syncs sanitized code to ParcelDashboard (public repo). Multiple fixes: PAT scope, credential handling, .github stripping, deep PII scrub (addresses, APNs, inspector names, phone numbers).
49. `a3b4abe` - `7f0314d` (Mar 22) -- RemoteLaunch procedure documentation.
50. `e632ed1` - `8b0fe40` (Mar 22) -- **Dark mode.** Toggle button, comprehensive CSS overrides including React inline styles in the checklist. Mirror workflow rewritten to use Python (sed delimiter conflicts). Iterative fixes for font colors.
51. `6ed15ab` (Mar 22) -- **Renamed `Doc/` to `reference/`.** Established `controller-note/` protocol.
52. `b123532` - `0007773` (Mar 22) -- Upnote protocol: rolling file format, auto-notify workflow (`.github/workflows/notify-controller.yml`), CLAUDE.md controller-note section.
53. `aeef4fe` (Mar 22) -- Repo cleanup: deleted `ProjectDev-Checklist-Legacy/`, synced index files, committed controller notes.
54. `5118856` (Mar 22) -- **Responsive merge.** 4 HTML files consolidated to 2. Mobile `_Mobile` variants deleted. CSS `@media` queries handle mobile. Mirror workflow simplified.
55. `a76d72b` (Mar 22) -- Free Drag + Snap Edge default ON, toggle states persisted in `_payload()`, lot boundary clamping always enforced.
56. `1606ac6` (Mar 22) -- **Architecture request** to controller: private/public config sync system (Reboot Public / Pull from Public).
57. `95b4bdc` (Mar 22) -- **Dark mode baked into source files** (was injected by mirror workflow). Mirror workflow now only fixes cross-links.

**Result:** Controller-managed repo. GitHub Pages mirror with PII scrub. Dark mode in source. Responsive single-file output. Controller-note protocol with auto-dispatch. Architecture for public/private config sync approved by controller.

---

### Phase 6: Multi-Site System (2026-03-22 - 2026-03-23)

**Address book dropdown, per-site configs, Westminster R-3.**

58. `0419c20` (Mar 22) -- **Multi-site system.** Address book dropdown in suite bar. `data/sites/` folder with per-site JSON configs. Server endpoints: `GET /api/sites` (list), `POST /api/sites/{id}/activate` (switch + rebuild). ConfigEngine clears localStorage on site switch. `engine-map.js` supports `parcelPolygon` for irregular lots.
59. `695fdfc` (Mar 22) -- CAD coordinate system toggle (CA/WA state plane zones).
60. `6c727e5` (Mar 23) -- Fix silent save failures: error feedback on server push.
61. `a29cb38` (Mar 23) -- **Westminster Ave site config** (`ca-westminster.json`). R-3 zoning (Garden Grove MDR). Multi-site isolation fixes.
62. `01d3bcd` (Mar 23) -- **Multi-site data accuracy.** Dynamic info tables (replaced 9 hardcoded Euclid cells). lotSF from actual survey instead of W*D. FAR/density zero-guards ("N/A" / "Per zoning" when 0).
63. `fe8cfaf` (Mar 23) -- **State bleed fix.** `_handle_activate_site` saves current state to previous site file BEFORE loading new site. Corner visibility chamfer (triangle on lot boundary using compass direction).
64. `5795ef5` (Mar 23) -- Chamfer compass direction fix (resolved dynamically from rotation). Rotation normalized to 0-360.
65. `9e94977` (Mar 23) -- Westminster multi-site polish: compass, zoning excel (`reference/build-zoning-excel.ps1` generates per-site XLSX), site data sync.

**Result:** Multi-site system with 3 sites (Euclid, Westminster, Burien). Per-site JSON configs. Address book dropdown. State isolation. Dynamic info tables. Corner visibility chamfer. Zoning Excel generator.

---

### Phase 7: Controller Dispatch Compliance (2026-03-25)

**Controller ran Dev-Check (26 findings) and Logic-Check (rename incomplete). Dispatch issued.**

66. `1a30da2` (Mar 25) -- **[DISPATCH-DONE].** Resolved all 6 GLOBAL items:
    - GLOBAL-001: Project Goal filled
    - GLOBAL-008: Safety Contract filled (read-only vs writable paths)
    - GLOBAL-007: Handoff Notes filled with current state
    - GLOBAL-010: `Set-StrictMode -Version Latest` added to both PS1 files
    - GLOBAL-022: Dev-Check section already present (no-op)
    - GLOBAL-016: `UserPref.json` created
    - Also: `report/` folder with `.gitkeep`, `.gitignore` confirmed present

---

### Current State (as of commit `1a30da2`, 2026-03-25)

**What exists:**
- 2 output HTML files: `Output/InteractiveMap.html`, `Output/PreApp_Checklist.html`
- Modular source in `src/`: `index.html`, `checklist.html`, `css/style.css`, `js/engine-*.js`
- PowerShell build: `Engine_InteractiveParcelMap.ps1` (compile + optional dev server on :7734)
- Python build: `tools/build.py` (alternative, adds serve mode + site activation endpoints)
- 3 site configs: `data/sites/euclid.json`, `ca-westminster.json`, `wa-burien.json`
- Active site data: `data/site-data.json` (merged into HTML at build time)
- Reference: `reference/` (zoning docs, best-practices from controller, build-zoning-excel.ps1)
- Controller notes: `controller-note/` (rolling upnotes, `.ping`/`.last-read` protocol)
- GitHub mirror: `.github/workflows/mirror-public.yml` (sanitized push to ParcelDashboard)
- Controller notify: `.github/workflows/notify-controller.yml` (dispatch on upnote change)
- Config stubs: `UserPref.json`, `report/.gitkeep`

**What works:**
- Interactive Leaflet map with draggable buildings, chain dimensions, setback visualization
- Multi-building concept design with per-building tabs, stacking, FAR checks
- Multi-site switching via address book dropdown (server mode)
- PreApp Checklist with State Density Bonus calculator, green-check UX, print/PDF
- Dark mode (persisted via localStorage, shared between map and checklist)
- Responsive layout (single file serves desktop + mobile via CSS @media)
- Compass overlay with True North (fixed) + Site North (draggable)
- Vehicle overlay placement (fire apparatus turn templates)
- Save to localStorage + server push + file download (all from `_payload()`)
- Corner visibility chamfer (dynamic compass direction)
- Zoning Excel generator (per-site XLSX from site-data.json)

**What is NOT done:**
- Public/private config sync (Reboot Public / Pull from Public) -- architecture approved, not built
- Canonical name decision: local folder is `ProjectBook-Planner`, GitHub repo is `MasterSiteDashboard`
- Zero test coverage
- `data/site-data.json` contains real PII (addresses, APNs, inspector names)
- Dual build systems (PS1 + Python) undocumented as a deliberate choice
- No CI validation step

**Open controller items:**
- Designer must decide canonical name before any rename work
- Controller will fix `launch_configs.json` phantom `_Mobile.html` entries
- Controller will register ParcelDashboard as child in global rules
- Controller will implement `repository_dispatch` listener for upnote events

---

## [2026-03-25 00:15] DISPATCH-DONE: Controller dispatch (2026-03-25) completed

All 6 pending GLOBAL items resolved:
- **GLOBAL-001:** Project Goal filled (interactive parcel map + pre-app checklist suite)
- **GLOBAL-008:** Safety Contract filled (read-only vs writable paths)
- **GLOBAL-007:** Handoff Notes filled with current session state
- **GLOBAL-010:** `Set-StrictMode -Version Latest` added to both PS1 files
- **GLOBAL-022:** Dev-Check section already present -- no action needed
- **GLOBAL-016:** `UserPref.json` created at project root

Also from controller action items:
- `report/` folder created with `.gitkeep`
- `.gitignore` was already in place (pre-done)
- Ping read and acknowledged (Dev-Check 26 findings, Logic-Check rename incomplete)

**Awaiting designer decision:** Canonical name = ProjectBook-Planner or MasterSiteDashboard?

---

## [2026-03-23 23:30] Westminster multi-site hardening + state bleed fix

### Fixes applied (4 dev-check rounds, 0 Critical / 0 Major remaining)
- **State bleed fix**: `build.py _handle_activate_site` now saves current state back to previous site file BEFORE loading new site. Prevents rotation/locked/checklist contamination across sites.
- **Falsy-zero bugs**: `||` to `??` for baseFAR, commFAR, densityPerSF, maxHeight in engine-ui.js and engine-setback.js. Sites with legitimate 0 values (Westminster R-3, Burien TBD) no longer inherit Euclid defaults.
- **lotSF**: FAR/density calculations now use actual surveyed lot area from site JSON instead of W*D rectangular approximation (15-20% error on irregular parcels).
- **Dynamic info tables**: Replaced 9 hardcoded Euclid table cells in index.html with dynamic population from `__SITE_DEFAULTS__` (zoning params, setbacks, height, FAR, inspectors).
- **FAR/density zero-guards**: When baseFAR=0 or densityPerSF=0, UI shows "N/A" / "Per zoning" instead of misleading red "Exceeds limit".
- **Corner visibility triangle**: Chamfer drawn on lot boundary using compass direction ("SW") resolved dynamically from rotation. Supports any rotation angle.
- **Rotation normalized to 0-360**: No more negative values.
- **Path traversal sanitization**: site_id validated in activate endpoint.
- **Euclid fully restored**: locked=true, setbacksApplied=true, checklist intact, no parcelPolygon (uses rectangle system).
- **Westminster**: R-3 zoning confirmed (Garden Grove MDR), no parcelPolygon (rectangle system like Euclid), 25ft SW chamfer, rotation=270.

### Euclid scope of work
Redevelop 6,250 SF commercial lot into 2-story mixed-use. Ground floor: commercial front (30' depth), 9 residential units across 4 buildings behind. 2nd floor all residential. 9 res + 1 comm total. Base FAR 2.0, base density (10 DU max), zero side setbacks. TPA = 0 parking.

---

## [2026-03-22 17:00] Multi-site system + address book dropdown -- IN PROGRESS

**Tagged stable Euclid as `v0.1-euclid-stable` before multi-site work.**

### What changed
- `data/sites/` folder: per-site JSON configs (`euclid.json`, `wa-burien.json`)
- `data/site-data.json` remains the "active" file the build reads
- Server endpoints: `GET /api/sites` (list), `POST /api/sites/{id}/activate` (switch + rebuild)
- Suite bar dropdown in both Map and Checklist -- fetches site list, switches on change
- `ConfigEngine` clears localStorage on site switch (prevents stale coords)
- `engine-map.js` supports `parcelPolygon` from GIS (irregular lot boundaries)
- POST `/save` writes back to active site file so per-site state persists

### For controller / Git-Projection (CTRL-006)
- Mirror workflow unaffected -- still mirrors `docs/` which is the active site's build
- Multi-site dropdown hides gracefully on static file:// (no server = no API = hidden)
- `data/sites/` should be included in mirror if we want public to have multi-site

### Architecture
```
User picks site in dropdown -> POST /api/sites/{id}/activate
  -> Server copies sites/{id}.json -> site-data.json
  -> Server rebuilds both HTMLs
  -> Client clears localStorage, reloads page
  -> New site loads fresh from __SITE_DEFAULTS__
```

---

## [2026-03-22 16:00] Dark mode baked into source files -- COMPLETED

**Dark mode is now in source (`src/`) instead of being injected by the mirror workflow.**

Changes:
- `src/css/style.css`: comprehensive dark mode CSS (toggle button, CSS variable overrides, map element overrides for sidebar, banner, buttons, LISP area)
- `src/index.html`: added theme-init script (before paint flash prevention) + toggle button
- `src/checklist.html`: added theme-init script, toggle button, and comprehensive React inline style dark mode overrides (~100 selectors covering all background colors, text colors, borders, shadows, gradients)
- `mirror-public.yml`: removed all dark mode injection code (~170 lines). Workflow now only fixes cross-links.

**For controller / Git-Projection (CTRL-006):**
- Mirror workflow is significantly simpler now -- no more dark mode CSS/JS injection
- Dark mode toggle persists via `localStorage('theme')` -- shared between map and checklist
- Both private (localhost) and public (GitHub Pages) sites now have identical dark mode behavior

---

## [2026-03-22 08:10] ARCHITECTURE REQUEST: Private/Public Config Sync -- NEEDS PLANNING

**User-designer requests a bidirectional config sync system between private and public sites.**

### Requirements (confirmed by user)

**Public site (ParcelDashboard / GitHub Pages):**
- Receive-only from private (no push back)
- Users can make config changes that persist independently
- Config must survive across devices/browsers (not just localStorage)
- Currently static HTML — no server-side save endpoint

**Private site (MasterSiteDashboard / localhost:7734):**
- "Reboot Public" button — force push private config to public, overwriting public state
- "Pull from Public" button — fetch public's current config into private
- Two-way: can push to public AND pull from public
- Manual trigger only — no auto-sync (hard to control)

**Data flow:**
```
Private (localhost)                    Public (GitHub Pages)
  |                                       |
  |-- "Reboot Public" ------------------>| (push config, overwrite)
  |<-- "Pull from Public" ---------------| (fetch config)
  |                                       |
  |                                       |-- User saves config
  |                                       |-- Persists independently
```

### Constraint: Public needs a persistence layer

GitHub Pages is static — no POST endpoint. Options evaluated:

| Option | Pros | Cons |
|--------|------|------|
| GitHub Gist | Free, API accessible | PAT token exposed in client JS |
| Repo file (ParcelDashboard) | Lives with code | Token exposure, triggers rebuild |
| Free JSON API (jsonbin.io, npoint.io) | No token in client, simple REST | Third-party dependency |
| Cloudflare Workers KV | Fast, reliable, own endpoint | Needs CF account setup |

### For Controller / Orchestrator

This needs architectural planning before implementation:
1. Choose persistence backend for public site config
2. Design the sync API (endpoints, auth, conflict resolution)
3. Determine if this affects CTRL-006 (Git-Projection) mirror workflow
4. Consider: should public config changes trigger a notification to private?
5. Security: public site must not expose tokens that allow repo writes

**Status:** Awaiting controller input on architecture choice. User confirmed this should be planned, not rushed.

---

## [2026-03-22 08:00] Free drag + snap edge defaults, toggle persistence, boundary enforcement

**Changes:**
- Free Drag and Snap Edge now default to ON (was OFF)
- `freeDrag` and `snapEdge` added to `_payload()` -- toggle states now persist across sessions
- Bootstrap syncs button visual state (text + color) from saved config on load
- Lot boundary clamping is ALWAYS enforced -- buildings cannot leave the lot even in free drag mode
- Snap Edge now snaps to lot boundary edges (setback lines) in addition to other buildings
- CLAUDE.md payload field list updated

**For controller / Git-Projection (CTRL-006):**
- `_payload()` has 2 new fields: `freeDrag`, `snapEdge`
- `site-data.json.saved` schema expanded accordingly

---

## [2026-03-22 07:45] Responsive merge -- COMPLETED (was PENDING)

**Mobile and desktop versions merged into single responsive files.**

Changes:
- `src/index.html`: added iPhone PWA meta tags (viewport-fit, apple-mobile-web-app, theme-color, touch-icon)
- `src/css/style.css`: added safe-area padding, touch CSS, input zoom prevention, extra mobile layout rules into existing `@media (max-width: 767px)` block
- `src/checklist.html`: added iPhone meta tags, touch CSS, error overlay for mobile debugging
- `tools/build.py`: removed `build_iphone_map()` and `build_iphone_checklist()`, added `copy_to_docs()`. Build now outputs 2 files instead of 4
- `mirror-public.yml`: removed mobile redirect injection, removed `_Mobile` file references
- Deleted all 4 `_Mobile` files from `Output/` and `docs/`
- Updated launcher pages (`index.html`, `docs/index.html`): removed "iPhone Version" buttons

**Result:** Single `InteractiveMap.html` and `PreApp_Checklist.html` serve both desktop and mobile via CSS `@media` queries. No redirect, no separate files.

**For controller / Git-Projection orchestra (CTRL-006):**
- ParcelDashboard mirror will now receive 2 HTML files instead of 4
- `docs/index.html` no longer links to `_Mobile` variants
- Mirror workflow simplified (no mobile redirect injection step)
- Update any cross-repo links pointing to `_Mobile` variants

---

## [2026-03-22 07:30] Repo cleanup

- Deleted `ProjectDev-Checklist-Legacy/` -- zero references, confirmed dead weight
- Synced root `index.html` to match `docs/index.html` (added dark mode, improved mobile hint)
- Merged `controller-upnote-03221416.md` detail into rolling `controller-upnote.md`, deleted timestamped file
- Committed controller's rolling note and `.ping` file

---

## [2026-03-22 07:22] CLAUDE.md updated with controller-note protocol -- READ THIS

**CONTROLLER ACTION REQUIRED:**
1. **Add a `repository_dispatch` listener** in `NP_ClaudeAgent` for event type `upnote-updated`. Payload includes `client_payload.repo` (source repo name) and `client_payload.ref` (commit SHA). On trigger, fetch and read `controller-note/{repo}-upnote.md` from the source repo.
2. **Propose rolling upnote format to all repos** -- one file per repo, not per-timestamp. This repo is already using it.
3. **Register ParcelDashboard as child of MasterSiteDashboard** in global rules -- no independent repo enforcement.

**What changed in CLAUDE.md:**
- Added `Controller-Note Protocol` section documenting: upnote file location, auto-notify workflow, session-start check behavior, mirror child ownership.
- This is now the standard operating procedure for this repo's agent.

**This push triggered `notify-controller.yml`** -- if you're reading this because of that dispatch, the system is working.

---

## [2026-03-22 07:18] Auto-notify workflow + upnote protocol revision

**Added `.github/workflows/notify-controller.yml`:**
- Triggers on push to `main` when `controller-note/**` changes
- Sends `repository_dispatch` event (`upnote-updated`) to `Blueberry0120x/NP_ClaudeAgent`
- Uses `PUBLIC_MIRROR_PAT` secret (already exists, has repo scope)

**Controller action required:**
1. Add a workflow in `NP_ClaudeAgent` that listens for `repository_dispatch` event `upnote-updated`
2. On trigger, read the upnote from the source repo (`client_payload.repo`) and process
3. This eliminates the need for user to manually say "review MasterSite notes"

**Upnote protocol revision (propose to all repos):**
- One rolling file per repo, not per-timestamp files (avoids spam)
- Auto-notify via GitHub Actions dispatch (no manual relay)
- Each agent checks `controller-note/` at session start automatically (stored in agent memory)
- User should never need to relay between agents manually

---

## ~~[2026-03-22 07:14] Mobile/Desktop Responsive Merge -- PENDING~~

**Current state:**
- Mobile auto-redirect exists ONLY in mirror workflow (`mirror-public.yml`), injected at deploy time
- Source files (`src/`, `Output/`) have NO auto-detection -- desktop and mobile are separate files
- Dev server (`localhost:7734`) serves desktop only
- 4 separate HTML files: InteractiveMap + _Mobile, PreApp_Checklist + _Mobile

**Requested by user-designer:** True responsive merge using `@media` queries / CSS breakpoints. Single file serves both. Eliminates `_Mobile` variants, simplifies build from 4 to 2 output files. Controller should coordinate timing with suite-wide changes.

---

## [2026-03-22 07:08] Doc/ renamed to reference/, controller-note protocol established

**Changes:**
- `Doc/` -> `reference/` (avoids confusion with `docs/` which is GitHub Pages)
- `docs/` stays -- GitHub Pages only allows `/` or `/docs` as source paths
- `controller-note/` created per controller mandate

**Mirror child ownership (authorized by user-designer):**
ParcelDashboard (`Blueberry0120x/ParcelDashboard`) is owned by MasterSiteDashboard agent. Full control -- Pages settings, repo settings, branch management, content pushes. No controller approval needed. Controller should not enforce independent repo rules on it.

---

## Standing Protocols

**Upnote format (revised):** One rolling file per repo (`{repo_name}-upnote.md`), not one file per update. Newest entries at top. Resolved items get strikethrough. Controller checks this single file -- no scanning for timestamped files.

**For controller CLAUDE.md / global rules:** Update the upnote protocol from per-timestamp files to single rolling file. Propose this to all repos.
