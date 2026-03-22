# MasterSiteDashboard -- Agent Upnote

> Single rolling note. Newest entries at top. Controller: check this file first.
> Format: `## [YYYY-MM-DD HH:MM] Topic` per entry. Mark resolved items with ~~strikethrough~~.

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
