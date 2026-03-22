# MasterSiteDashboard -- Agent Upnote

> Single rolling note. Newest entries at top. Controller: check this file first.
> Format: `## [YYYY-MM-DD HH:MM] Topic` per entry. Mark resolved items with ~~strikethrough~~.

---

## [2026-03-22 07:14] Mobile/Desktop Responsive Merge -- PENDING

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
