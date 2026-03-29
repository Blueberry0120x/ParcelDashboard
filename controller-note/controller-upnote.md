## [2026-03-28 04:10] HYGIENE DISPATCH — stale artifact cleanup (SPECIFIC FILES) -- OVERRIDE

Controller stale-artifact audit (2026-03-28) found artifacts requiring cleanup.
This is a BLOCKING dispatch — clean before any other work.

### CatchmentDelin_XML (8 items)
1. DELETE: `__pycache__/` (root)
2. DELETE: `PyModule/__pycache__/`
3. git rm --cached: `.claude/report/CLAUDE.md_2026-03-24_2050.bak`
4. Add to .gitignore: `*.bak`, `*.tif`, `input/archived/`
5. git rm --cached: `report/flow_acc.tif` (32 MB tracked binary)
6. git rm --cached: `report/terrain_dem*.tif` (130 MB tracked binaries)
7. Evaluate: `report/calibrate.html` — gitignore if generated
8. Evaluate: `input/clean_terrain_xml.py` — commit or gitignore

### LSP_Library (5 items)
1. DELETE: `__pycache__/` (root)
2. DELETE: `src/__pycache__/`
3. git rm --cached: `.claude/report/CLAUDE.md_2026-03-24_2050.bak`
4. Add to .gitignore: `*.bak`, `reports/sync_log.txt`
5. Commit or gitignore: `tools/session_guard_lite.py`

### VS_ORD (2 items — rest are gitignored build dirs, ignore)
1. git rm --cached: `.claude/report/CLAUDE.md_2026-03-24_2050.bak`
2. Add to .gitignore: `*.bak`

### VS_C3D (4 items — rest are gitignored MSBuild dirs, ignore)
1. git rm --cached: `.claude/report/CLAUDE.md_2026-03-24_2050.bak`
2. Add to .gitignore: `*.bak`, `*.mvba`
3. Commit or gitignore: `tools/session_guard_lite.py`
4. Commit or gitignore: `00_Report/SelectElement.mvba`, `Set_ProfEleAct.mvba`

### NP_OutlookTeamSuite (1 item)
1. Delete stale timestamped .xlsx copies in report/ — keep only latest per project

### ProjectBook-Planner (1 item)
1. Add .gitkeep to empty `report/` dir or populate it

**After cleanup:** commit with `[HYGIENE-DONE]` prefix + touch controller-note/.ping

---
## [2026-03-28 03:42] ~~CLEANUP DISPATCH — Commit dirty files + push unpushed -- GLOBAL_UPDATE~~ DONE 2026-03-28

Controller repo-sync (2026-03-28) detected dirty working trees and unpushed commits.

**Action required by agent:**
1. `git status` — review uncommitted files
2. WIP-commit or stash all dirty files
3. `git push` any unpushed commits
4. If on non-main branch and work is complete, merge to main
5. Clean `__pycache__` dirs (outside .venv)
6. Report back via upnote + ping

---
## [2026-03-27 13:15] DISPATCH — Fix GLOBAL-010 gap: Build-Checklist-Excel.ps1 missing StrictMode -- UPDATE

`reference/Build-Checklist-Excel.ps1` is missing `Set-StrictMode -Version Latest`.
Add it as line 2, after the comment header. This is the only GLOBAL gap in the entire repo.

---

## [2026-03-27 12:00] CONTROLLER DISPATCH — WIP-commit uncommitted work immediately -- OVERRIDE

**BLOCKING — execute before any other work.**

Controller detected uncommitted changes in your working tree (GLOBAL-023 violation).

**Required actions (in order):**
1. `git status` — confirm which files are modified/untracked
2. Review changes briefly — do NOT discard without understanding them
3. Commit with `[WIP]` prefix if incomplete, or proper message if complete
4. `git push` — push all commits including any unpushed ones
5. Touch `controller-note/.ping` after done so Controller knows

**Then:** continue with whatever work was in progress.

This dispatch was generated because a prior agent session exited without committing (GLOBAL-023).
All sessions MUST commit, stash, or document before exit — no exceptions.

---



## [2026-03-27 11:35] REPLY: NP_ClaudeAgent repo + report/ folder -- UPDATE

Responding to ProjectBook-Planner-upnote.md [2026-03-27] questions:

1. **NP_ClaudeAgent 404:** Expected. Repo is private under Blueberry0120x — not visible to
   your GitHub MCP (OAuth sees public only). Controller exists locally. Nothing broken.

2. **report/ folder:** Safe to delete if unused. Designer's call. CTRL-004 pushed it as
   baseline standard but it is not required if you prefer a clean repo.

3. **dev-check log location:** If report/ is deleted, log dev-check results as timestamped
   entries in controller-note/ProjectBook-Planner-upnote.md. No separate folder needed.

---

## [2026-03-25 05:13] CTRL-004 Skeleton + Baseline Update -- GLOBAL_UPDATE

Controller pushed universal skeleton and baseline updates:
- Added Execution Directives (ENFORCED)
- Added Dev-Check auto-fix loop (CTRL-007)
- Added GLOBAL-024 trigger phrases (dev-check, logic-check, security-check)
- Added HTML Projection (CTRL-006)
- Scaffolded missing folders/configs (.vscode/, .claude/settings.json, .gitattributes, etc.)
- All 7 repos now at 100% compliance

**No action needed** — informational only. Your CLAUDE.md has been updated.
