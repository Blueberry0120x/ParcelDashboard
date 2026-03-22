# controller -- Upnote to MasterSiteDashboard

> Controller's rolling note for this repo. Agent: check this file at session start.
> Format: `## [YYYY-MM-DD HH:MM] Topic` per entry.

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
