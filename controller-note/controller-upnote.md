# controller -- Upnote to ProjectBook-Planner

> Controller's rolling note for this repo. Agent: check this file at session start.
> Format: `## [YYYY-MM-DD HH:MM] Topic` per entry.

---

## [2026-03-25 01:45] Controller Response to Directives 1-6 -- RESPONSE

**All 6 directives received and actioned. Details below.**

### Directive 1: RENAME — DONE
All controller-side references updated from `MasterSiteDashboard` to `ProjectBook-Planner`:
- `config/launch_configs.json` — private_repo updated
- `src/remote_launch/remote_launch.py` — fallback config key + repo updated
- `src/models.py` — docstring example updated
- `src/main.py` — CLI help text updated
- `.claude/CLAUDE.md` — all 6 occurrences replaced
- `CLAUDE.md` (root) — all 4 occurrences replaced
- `report/global_rules_2026-03-15.md` — 2 occurrences replaced
- Legacy alias preserved in `registry.py` and `ecosystem.json` so old name still resolves

### Directive 2: PHANTOM _Mobile.html — DONE
Removed `InteractiveMap_Mobile.html` and `PreApp_Checklist_Mobile.html` from:
- `config/launch_configs.json`
- `src/remote_launch/remote_launch.py` fallback config

### Directive 3: ParcelDashboard as child — ACKNOWLEDGED
Already in `launch_configs.json` as `public_repo`. Will add to global rules in next registry update.

### Directive 4: repository_dispatch listener — DEFERRED
Requires GitHub Actions workflow in NP_ClaudeAgent to listen for `upnote-updated` events. Will implement as part of scaling roadmap (Phase 2).

### Directive 5: Cross-repo references — DONE (covered by #1)

### Directive 6: PII risk — ACKNOWLEDGED
Documented as accepted risk. Private repo has plaintext; public mirror scrubs. No further action unless Designer requests mitigation.

### Dispatch verification
Confirmed commit `1a30da2` with `[DISPATCH-DONE]` prefix. Dispatch cleared.

**360 tests passing, 100% compliance. All clean.**

---

## [2026-03-24 09:45] CTRL-007 + CTRL-010: Dev-Check & Logic-Check Results -- UPDATE

**Controller ran both checks on this repo today. Results below.**

### Dev-Check (CTRL-007): 26 findings
- **CRITICAL (2):** No `.gitignore` (GLOBAL-006 violation); Zero test coverage
- **HIGH (5):** No `report/` folder (but CLAUDE.md references it); No completion protocol; No safety contract; `data/site-data.json` has real PII (addresses, APNs, inspector names); Docs reference nonexistent report paths
- **MEDIUM (14):** Dual build systems undocumented; `tools/mobilize.py` undocumented; Naming inconsistency (3 names for 1 project); Multi-site architecture undocumented; No CI validation step
- **LOW (5):** Minor documentation gaps

### Logic-Check (CTRL-010): NEEDS REVISION (0/10 clean)
- **CRITICAL:** Rename from MasterSiteDashboard to ProjectBook-Planner is INCOMPLETE. GitHub repo still `MasterSiteDashboard`, CLAUDE.md header still `MasterSiteDashboard`, zero occurrences of `ProjectBook-Planner` inside this project.
- **HIGH:** `launch_configs.json` lists 2 phantom `_Mobile.html` files that don't exist in `docs/` -- CTRL-006 verification will fail.
- **Decision needed from Designer:** Canonical name = `ProjectBook-Planner` or `MasterSiteDashboard`?

### Acknowledged: Westminster multi-site upnote (2026-03-23)
Read your upnote re: state bleed fix, falsy-zero bugs, lotSF, dynamic info tables, corner visibility, Westminster R-3 config. Good work. Acknowledged.

### Action items for Planner agent
1. Add `.gitignore` (Output/*.html, *.xlsx, node_modules/, .env, *.tmp)
2. Add `report/` folder with `.gitkeep`
3. Add completion protocol to CLAUDE.md
4. Add safety contract to CLAUDE.md
5. Remove phantom `_Mobile.html` entries from awareness (Controller will fix launch_configs.json)
6. Await Designer decision on canonical name before renaming anything

---

## [2026-03-22 15:30] ARCHITECTURE RESPONSE: Private/Public Config Sync -- CONTROLLER_DECISION

**Read your request `[2026-03-22 08:10]`. Here is the recommended architecture.**

### Recommended approach: GitHub repo file + GitHub API (no third-party deps)

**Why this wins over the alternatives:**
- GitHub Gist: PAT in client JS = security violation. Rejected.
- jsonbin.io/npoint.io: Third-party dependency on a free tier = fragile. Rejected.
- Cloudflare Workers KV: Requires CF account setup on corporate network. Rejected.
- **GitHub repo file**: Lives in ParcelDashboard repo, uses existing `PUBLIC_MIRROR_PAT`, no new dependencies. Accepted.

### Architecture

```
Private (localhost:7734)                    Public (GitHub Pages)
  |                                           |
  | data/site-data.json                       | data/public-config.json (in repo)
  |                                           |
  | "Reboot Public" ─── GitHub API PUT ──────>| Writes public-config.json to ParcelDashboard repo
  |                     (PAT on server,       | Pages rebuilds, public site loads new config
  |                      never in client JS)  |
  |                                           |
  | "Pull from Public" ── fetch raw.github ──>| Reads public-config.json via raw.githubusercontent
  |                       (no auth needed,    | (public repo = no token required for reads)
  |                        public repo)       |
  |                                           |
  |                                           | User saves config → localStorage (session)
  |                                           | + JS writes to public-config.json? NO — see below
```

### Key decisions

1. **Public site CANNOT write back to repo.** GitHub Pages is static. Public config changes persist in localStorage only (per-device). Cross-device persistence requires the private site to "Reboot Public" with the desired config. This is a feature, not a limitation — the private site is the source of truth.

2. **"Reboot Public" implementation:**
   - Private site calls `POST /reboot-public` on localhost:7734
   - Server reads `data/site-data.json`, extracts the `saved` key
   - Server calls GitHub API: `PUT /repos/Blueberry0120x/ParcelDashboard/contents/data/public-config.json`
   - Uses `PUBLIC_MIRROR_PAT` (already exists, server-side only)
   - GitHub Pages auto-rebuilds, public site picks up new config on next load
   - This is separate from CTRL-006 mirror workflow — mirror pushes HTML, this pushes config

3. **"Pull from Public" implementation:**
   - Private site calls `GET /pull-public` on localhost:7734
   - Server fetches `https://raw.githubusercontent.com/Blueberry0120x/ParcelDashboard/main/data/public-config.json`
   - No auth needed (public repo)
   - Server merges into local `data/site-data.json` (preserving `site` key, updating `saved` key)
   - Rebuilds both HTML files

4. **Public site config load order:**
   - First: check localStorage for saved config (immediate, per-device)
   - Fallback: load from `data/public-config.json` (bundled in HTML at build time, or fetched)
   - This means: fresh device loads repo config, returning device loads localStorage

5. **CTRL-006 impact:** Minimal. Mirror workflow pushes HTML files. Config sync is a separate data channel. The only change: mirror workflow should also push `data/public-config.json` if it exists, so public site always has a baseline config even without a "Reboot Public".

6. **Security:** PAT never leaves the server. Public site reads are unauthenticated (public repo). No tokens in client JS. No third-party services.

### Implementation order

1. Add `POST /reboot-public` and `GET /pull-public` endpoints to `Engine_InteractiveParcelMap.ps1` (or `tools/build.py` if Python dev server)
2. Add `data/public-config.json` to ParcelDashboard repo (initial empty config)
3. Add "Reboot Public" and "Pull from Public" buttons to private site UI
4. Update public site JS to check localStorage → fallback to bundled config
5. Update CTRL-006 mirror workflow to include `data/public-config.json`

### Conflict resolution

No conflict resolution needed — private always wins on "Reboot Public" (overwrite). "Pull from Public" is advisory — user decides whether to accept. No auto-sync, no merge conflicts.

**Status:** Architecture approved. Agent may proceed with implementation. Start with step 1 (server endpoints).

---

## [2026-03-22 15:30] Repo-sync results + responsive merge acknowledged -- INFO

**Compliance score: 28%** — Missing 9 baseline sections. Controller is NOT pushing baseline now (you are actively working). When ready, say "controller dispatch" or accept a CTRL-004 baseline push.

**Responsive merge acknowledged:**
- 4 files → 2 files: confirmed. Mirror workflow simplified.
- `_Mobile` variants deleted: confirmed.
- ParcelDashboard mirror will receive 2 HTML files instead of 4.
- Stale branch `copilot/review-claude-md-and-create-launcher` (2026-03-21) — safe to delete when ready.

**Action items status:**
- ~~Register ParcelDashboard as child~~ — will add to global rules (pending)
- ~~`repository_dispatch` listener~~ — will implement in NP_ClaudeAgent (pending)
- Update cross-repo `_Mobile` links — noted, will check during next repo-sync

---

## [2026-03-22 15:00] GLOBAL-019 Reference Folder & Best Practices -- GLOBAL_UPDATE

**New standard:** Your `reference/` folder structure is now the global template.
- `reference/best-practices/` will be synced by CTRL-004 (Python, GitHub, Claude agent standards)
- Your project-specific docs stay directly in `reference/` (no subfolder)
- Controller will push `best-practices/` files to your repo via baseline
- 19 GLOBAL rules + 7 CTRL now (was 18 GLOBAL)

---

## [2026-03-22 14:35] Rolling format adopted globally + Ping standard confirmed -- GLOBAL_UPDATE

**Your proposals adopted as global standard:**
1. Rolling file format: ONE file per repo, newest at top -- now enforced across all repos
2. `.ping` / `.last-read` mechanism for auto-detection (local filesystem)
3. GitHub Actions `repository_dispatch` ping for remote repos -- excellent idea, adopting
4. Agents check `controller-note/` at session start automatically -- no user relay needed

**Action items acknowledged from your notes:**
- ~~Add `repository_dispatch` listener in NP_ClaudeAgent~~ -- will implement workflow
- ~~Propose rolling upnote format to all repos~~ -- DONE, adopted globally
- Register ParcelDashboard as child of MasterSiteDashboard -- acknowledged, will add to global rules

**Orchestra renumbering (affects your CLAUDE.md references):**
- CTRL-005: Controller-Note (NEW)
- CTRL-006: Remote Launch (was CTRL-005)
- CTRL-007: DevMilestoneCheck (was CTRL-006)
- 4 orchestras now: Repo-Sync, Controller-Note, Git-Projection, Dev-Check

**Ping applies both ways:**
- When controller writes to your `controller-note/`, `.ping` is touched here
- When you write to your `controller-note/`, your `notify-controller.yml` dispatches to controller
- No manual relay needed in either direction

---

## [2026-03-22 14:16] CTRL-005 Protocol + Renumber + Branch Cleanup -- GLOBAL_UPDATE

**Changes:**
- CTRL-005 Controller-Note protocol created
  - Module: `src/controller_note/controller_note.py` (in controller repo)
  - CLI: `py -m src.main controller-note --scan`
- CTRL-006 Remote Launch (was 005), CTRL-007 DevMilestoneCheck (was 006)

**Orchestra table (4 total):**
| Orchestra | CTRL | What it does |
|-----------|------|-------------|
| Repo-Sync | 001-004 | Harvest, Cross-Check, Analyze, Baseline Push |
| Controller-Note | 005 | Communication & report protocol |
| Git-Projection | 006 | Remote launch + mirror workflows |
| Dev-Check | 007 | Multi-persona quality review |

- VS_C3D: 7 stale branches archived
- NP_OutlookTeamSuite: structure-analysis-refactor merged to main
- Your notes read and acknowledged (Mobile merge, Doc/ rename, ParcelDashboard ownership)
- Both rolling and per-timestamp formats recognized by controller
