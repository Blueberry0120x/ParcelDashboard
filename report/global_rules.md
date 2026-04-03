# Global Agent Controller — Rules & Standards Registry

**Date:** 2026-04-01
**Supersedes:** `report/global_rules_2026-03-27.md`
**Controller Repo:** `Blueberry0120x/NP_ClaudeAgent`
**Assigned by:** Nathan Pham (Designer)

**Consolidation notes (2026-03-26):**
- GLOBAL-006 now absorbs GLOBAL-018 (HTML verify) and GLOBAL-023 (session exit) — one rule, three phases
- GLOBAL-022 now absorbs GLOBAL-026 — requirement + access in one place
- GLOBAL-013 and GLOBAL-014 inlined (no more cross-references to personal CLAUDE.md)
- CTRL-005 now absorbs old CTRL-006 (rule versioning) and old CTRL-007 (report format) as subsections
- GLOBAL-003 typo fixed (`new-branch`)
- CTRL-011 (Security-Check) retired — noted in change log
- All trigger phrases consolidated under GLOBAL-024 (single source)

**Rule update notes (2026-03-27):**
- Added GLOBAL-028 stale-artifact hygiene rule (mandatory scan cadence + archive policy + hygiene dispatch template)

**Rule update notes (2026-04-01):**
- Added CTRL-006 (Git-Projection / Remote Launch) — reuses number from retired old CTRL-006; now covers HTML mirror workflows
- Added CTRL-007 (DevMilestoneCheck / Dev-Check) — reuses number from retired old CTRL-007; now covers multi-persona quality review
- Hooks baseline restructured to v9: hooks/ skills/ tools/ subfolders
- hook_registry.json updated: 7 previously undocumented wired hooks now documented

**Rule update notes (2026-04-02):**
- Added GLOBAL-029 Cross-Platform Mandatory (XPLAT-001) — remote CLI from phone = Linux; platform-gated code with silent no-ops caused repeated hanging. Enforced by `tests/test_xplat_guard.py` AST guard

---

## 0. Role Definitions

### Designer (Nathan Pham)
The human owner. Defines project goals, approves rules, corrects agent behavior.
All rules ultimately derive from the Designer's decisions.

### Controller — Three Modes

The Controller is ONE agent (NP_ClaudeAgent) that runs in three modes depending
on how and where it is accessed:

#### Local Controller (interactive CLI session)
The primary mode. Runs in VS Code terminal as an interactive Claude CLI session.
- **Access:** Full local filesystem, git, Python pipeline, all CTRL functions
- **Lifetime:** Active while the terminal is open; dies when closed
- **When used:** Interactive work sessions — analysis, coding, pipeline runs
- **Identity:** "the Controller" or "Master Controller" in conversation

#### Remote Controller (CTRL-008, persistent background process)
A `claude.exe remote-control` process running in background on the same machine.
- **Access:** Full local filesystem (same as Local Controller)
- **Lifetime:** Persistent — keep-alive nudge prevents Windows sleep
- **Managed by:** `py -m src.main remote-invoke --start/--stop/--reinvoke/--status`
- **When used:** Receives commands when VS Code is closed; future bridge for Cloud
- **Terminology:** "initiate" = first launch on boot; "re-invoke" = stop + restart fresh

#### Cloud Controller (claude.ai on web/phone)
Claude running on claude.ai, accessed from a browser or phone.
- **Access:** GitHub MCP ONLY — can only see committed + pushed files
- **Lifetime:** Active while browser tab / app is open; dies when closed
- **Bridge file:** `controller-note/controller-remote-note.md` — Local writes,
  Cloud reads via GitHub MCP. Cloud writes back + pushes for Local to read.
- **When used:** Quick checks, status reads, notes to self when away from PC
- **Limitation:** Cannot access local filesystem, uncommitted changes, or runtime state

#### Communication flow

```
Cloud Controller  --(GitHub MCP)-->  controller-remote-note.md  <--  Local Controller
       |                                                                    |
       '-------- future: direct relay ---->  Remote Controller  <-----------'
                                              (CTRL-008, always on)
```

**Current state:** Cloud and Local communicate via `controller-remote-note.md`
(committed to git). Cloud reads it via GitHub MCP, Local reads it from filesystem.
Per GLOBAL-021, all operational files must be committed and pushed so Cloud can see them.

**Rules for all three modes:**
- Per GLOBAL-006 (Session Exit): ALL modes must commit, stash, or document before session exit
- Per GLOBAL-021: ALL operational files must be git-tracked and pushed
- Cloud Controller MUST write to `controller-remote-note.md` + push after any work
- Local Controller MUST check `controller-remote-note.md` at session start for cloud entries

Assigned to:
- **Scan** all project repos for CLAUDE.md files and project state
- **Read** and analyze rule quality, completeness, and consistency
- **Report** findings — gaps, conflicts, drift from global standards
- **QC** — verify each project CLAUDE.md meets the global standard
- **Standard check** — enforce the rules defined in this document

The Controller does NOT modify other projects' code. It reads, analyzes, and
reports. The Designer or project-level agents act on the findings.

### Project Agent (per-repo Claude session)
The Claude instance working inside a specific project. Must follow:
1. Global rules (this document)
2. Project-level CLAUDE.md rules
3. Designer's live instructions

If a project rule conflicts with a global rule, the **global rule wins** unless
the project CLAUDE.md explicitly declares an override with justification.

---

## 1. GLOBAL RULES

These apply to **every** project under the Designer's control. Project-level
CLAUDE.md files may extend but not contradict these.

---

### GLOBAL-001: Project Goal Declaration

**Rule:** Every project CLAUDE.md MUST declare the project goal at the top,
immediately after the title.

**Format:**
```markdown
# Project Name

## Project Goal
<1-3 sentences: what this project does, why it exists, who it serves>
```

**Lifecycle:**
- Declared at project creation
- Editable at any time — user can say "what is our goal?", "edit goal",
  "update the goal", or any natural phrasing
- The agent must be able to recall and state the current goal when asked
- Goal changes must be reflected in the CLAUDE.md immediately

**Periodic check-in:** The project agent MUST proactively ask the Designer
to review the goal:
- After every **20 commits** on any branch
- When a **new branch** is created
- Phrasing: "Current project goal is: <goal>. Still accurate, or should we update it?"

**Why:** Without a declared goal, agents default to local optimizations without
understanding the bigger picture. The 20-commit / new-branch trigger catches drift.

**Controller check:** Scan each project CLAUDE.md. Flag any missing a Project Goal
section. Check commit count since last goal review.

---

### GLOBAL-002: File Encoding — UTF-8 Mandatory

**Rule:** All source files MUST be UTF-8 encoded. No exceptions.

| File type | BOM | Line endings |
|-----------|-----|-------------|
| Python (`.py`) | No BOM | LF preferred, CRLF tolerated |
| JavaScript / HTML / CSS | No BOM | LF preferred, CRLF tolerated |
| JSON / YAML / TOML | No BOM | LF preferred, CRLF tolerated |
| Markdown (`.md`) | No BOM | LF preferred, CRLF tolerated |
| PowerShell (`.ps1`, `.psm1`) | UTF-8 with BOM | CRLF (Windows convention) |
| CMD (`.cmd`, `.bat`) | UTF-8 with BOM or ASCII | CRLF |
| C# (`.cs`) | UTF-8 with BOM | CRLF |
| AutoLISP (`.lsp`) | ASCII subset of UTF-8 | CRLF |

**Forbidden encodings:** Latin-1, Windows-1252, UTF-16, Shift-JIS, or any legacy
codepage. If a file arrives in a non-UTF-8 encoding, convert it on import and note
the conversion.

**PowerShell BOM note:** PS1/PSM1 files use BOM because older PowerShell versions
(5.1) default to the system codepage if no BOM is present. Stantec machines may
run 5.1 for compatibility.

**Why:** Mixed encodings cause silent data corruption — accented characters in
contact names, special symbols in CAD descriptions, coordinate labels all break
if encoding drifts.

**Controller check:** `file --mime-encoding` on all tracked files. Flag any non-UTF-8.

---

### GLOBAL-003: Branch Naming Convention

**Rule:** All branches MUST follow one of these patterns:

| Pattern | When to use | Example |
|---------|-------------|---------|
| `main` | Default/stable branch | `main` |
| `dev{N}` | Primary development iteration | `dev1`, `dev2` |
| `feature/{topic}` | New feature or capability | `feature/audit-scan` |
| `claude/{topic}-dev{N}` | Claude-initiated work branch | `claude/export-map-ui-dev3` |
| `fix/{topic}` | Bug fix | `fix/encoding-crash` |
| `refactor/{topic}` | Restructuring without behavior change | `refactor/split-modules` |

**Increment rule:** When creating a new branch in a series, the dev index N
MUST be the last existing index + 1. Never reuse a deleted branch number.

**Tag convention:**

| Pattern | When | Example |
|---------|------|---------|
| `v{MAJOR}.{MINOR}.{PATCH}` | Release milestone | `v1.0.0` |
| `baseline-{YYYY-MM-DD}` | Known-good snapshot | `baseline-2026-03-15` |

**Forbidden patterns:**
- Spaces in branch names
- Uppercase letters (use kebab-case: `my-feature` not `MyFeature`)
- Generic names: `test`, `temp`, `wip`, `stuff`, `new-branch`
- Copilot/tool auto-generated names with random suffixes (e.g.,
  `copilot/migrate-revit-templates-fomet`) — rename immediately or delete

**Why:** Consistent naming makes `git branch -a` scannable at a glance. The
`claude/` prefix identifies AI-generated branches for review.

**Controller check:** `git branch -r` across all repos. Flag branches that
don't match any pattern.

---

### GLOBAL-004: Script Root Derivation — Never Hardcode Paths

**Rule:** Every script MUST derive its own root directory at runtime. Absolute
paths are FORBIDDEN in source code (except in CLAUDE.md documentation and
config files that are gitignored).

| Language | Pattern | Variable |
|----------|---------|----------|
| CMD | `set "ROOT=%~dp0"` | `%ROOT%` |
| PowerShell | `$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition` | `$ScriptRoot` |
| Python | `ROOT = pathlib.Path(__file__).resolve().parent` | `ROOT` |
| C# | `AppDomain.CurrentDomain.BaseDirectory` | — |

**CMD smart naming rule:** Every `.cmd` launcher uses `%~n0` (its own base name
without extension) to locate its `.ps1` target. Renaming the pair keeps them in
sync — no hardcoded references to break.

**PS1/PSM1 structure:**
```
Root/
  *.cmd          Launchers — set ROOT, call matching .ps1 by %~n0
  *.ps1          Entry points — derive $ScriptRoot, import Modules/Loader.psm1
  Modules/
    Loader.psm1  Module loader — defines load order, exports Import-*Modules
    *.psm1       Feature modules — never import each other directly
```

**Why:** Hardcoded paths break when OneDrive syncs to a different machine, when
the repo is cloned to a new location, or when the folder is renamed.

**Controller check:** Grep for `C:\\Users` in `.py` and `.ps1` files. Flag any
hardcoded user paths in source files.

---

### GLOBAL-005: Report Folder Convention

**Rule:** Every project MUST use a `report/` folder for all output artifacts.

| What goes in `report/` | Tracked in git? |
|------------------------|-----------------|
| Handoff notes, session reports | Yes |
| Audit reports, analysis reports | Yes |
| Generated runtime data (JSON, HTML, xlsx, CSV) | **No** — gitignored |
| Debug output, logs | **No** — gitignored |

**Gitignore pattern for `report/`:**
```gitignore
report/*.json
report/*.html
report/*.xlsx
report/*.csv
report/*.log
!report/*.md
```

**Why:** Separating reports from source code keeps the repo clean. Markdown
reports are tracked because they carry knowledge forward across sessions.

**Controller check:** Verify `report/` exists. Verify gitignore covers runtime
artifacts.

---

### GLOBAL-006: Completion, Verification & Session Protocol

*Consolidates former GLOBAL-006 (Completion Protocol), GLOBAL-018 (HTML Build
Verification), and GLOBAL-023 (Session Exit Rule) — three sequential phases of
the same lifecycle.*

#### Part A — Pre-Commit Verification (before declaring any task done)

**Rule:** Every project CLAUDE.md MUST define a completion protocol — the
minimum verification steps before any task is considered "done."

**Minimum requirements (all projects):**
1. Run the project's test suite or debug script
2. Verify zero errors in output
3. If either fails, fix before committing

**Project-specific examples:**

| Project | Extra steps |
|---------|------------|
| NP_OutlookTeamSuite | Check `UserPref.json` keywords, run `debug.ps1` (3 stacks) |
| CatchmentDelin_XML | Run engine, open HTML map, verify visual output |
| LSP_Library | Rebuild HTML after any Build_LspLibrary.py change |

**Format in CLAUDE.md:**
```markdown
## Completion Protocol
Before declaring any task complete:
1. <verification step>
2. <verification step>
3. If any step fails, fix the issue. Do NOT mark done until all pass.
```

#### Part B — HTML Build Verification (projects producing HTML output)

**Rule:** After building, rebuilding, or transforming ANY HTML file, the agent
MUST open or fetch every output HTML to verify it renders correctly. No HTML
task is complete until visual verification passes.

**Applies to:** Folium/Leaflet map generation, React/Babel compiled apps,
GitHub Actions transforms, any script producing `.html` output.

**Process:**
1. Open every output HTML in the browser (`start` on Windows) — or `WebFetch`
   the live URL if hosted
2. Confirm the page loads without blank screens or JS console errors
3. For hosted pages, verify the live URL returns content — not 404 or blank
4. If verification fails, fix and rebuild. Do NOT declare complete.

**Why:** HTML builds can silently produce broken output — missing JS, wrong paths,
encoding issues, blank pages. "It compiled" is not "it works."

#### Part C — Session Exit (before ending any session)

**Rule:** Before ending ANY session (local CLI, remote-control, or web/Claude.ai),
if uncommitted changes exist, the agent MUST do one of:

1. **Commit** — with `[WIP]` prefix if incomplete, or proper message if complete
2. **Stash** — `git stash push -m "WIP: description"`
3. **Write to upnote** — explain what was left incomplete and why

**Never leave uncommitted work with no record.**

**Session exit checklist:**
```
Before ending this session:
- [ ] git status — any uncommitted changes?
- [ ] If yes: commit, stash, or document in upnote
- [ ] If WIP: use [WIP] commit prefix so next session knows to continue
- [ ] Touch .ping if any cross-repo notes were written
- [ ] Archive chat history to memory/chat-history/{date}_session-{topic}.md
```

**Why (incident 2026-03-23):** Controller audit found orphaned uncommitted work
across 5 of 7 repos — all from remote/web sessions that edited files but never
committed. The pre-commit gate (Part A) does not fire if the session dies
mid-work. Part C fills that gap.

**Applies to:** All agent modes — local CLI, remote-control (CTRL-008),
web/Claude.ai, any future session mechanism.

**Controller check:**
- Part A: Scan CLAUDE.md for Completion Protocol section
- Part B: During CTRL-003, verify HTML sessions included launch/verify step
- Part C: CTRL-003 flags repos with uncommitted changes as compliance gaps

---

### GLOBAL-007: Handoff Notes

**Rule:** Every project CLAUDE.md SHOULD include dated handoff notes for
session continuity.

**Format:**
```markdown
## Handoff Notes (last updated YYYY-MM-DD)

### What was completed this session
- <bullet points>

### What still needs work
- <bullet points with priority>

### Known issues
- <bullet points>
```

**Rules:**
- Always use absolute dates (YYYY-MM-DD), never relative ("last Thursday")
- Most recent entry goes at the top
- Old entries can be archived to `report/` when CLAUDE.md gets too long
- Handoff notes are NOT a substitute for git commit messages — they capture
  context and intent that commits don't

**Why:** Handoff notes allow a new Claude session to resume exactly where the
last one stopped — including bugs in progress, research findings, and partial
fixes. Without them, every session starts from scratch.

**Controller check:** Check for Handoff Notes section. Flag projects with
>20 commits but no handoff notes.

---

### GLOBAL-008: Safety Contract — Read-Only vs Writable Boundaries

**Rule:** Every project that reads from an external source MUST declare a
safety contract: what is read-only and what is writable.

**Format:**
```markdown
## Safety Contract
- **Read-only:** <source directories, external APIs, shared drives>
- **Writable:** <project directory only, specific output paths>
- **Never touch:** <other projects, config files owned by other modules>
```

**Examples:**

| Project | Read-only | Writable |
|---------|-----------|----------|
| LSP_Library | `6_VS_LSP\LSP MASTER LIBRARY` | `LSP_Library/` only |
| NP_OutlookTeamSuite | `team_settings.json` (via Team_Config.psm1 only) | Each module owns its own JSON |
| CatchmentDelin_XML | `MetaData/Drainage_XML.xml` | `report/`, Python source |

**Why:** Without this, an agent might "helpfully" modify master source files.
The CatchmentDelin cross-project warning exists because a git operation in one
project wiped uncommitted changes in another.

**Controller check:** Flag projects that read external files but have no safety
contract defined.

---

### GLOBAL-009: Settings/Config Ownership

**Rule:** Each configuration file MUST have exactly one owning module. No other
module may write to it directly.

**Pattern:**
```
config_file.json  ←  owned by  →  OwnerModule.psm1 (or owner.py)
                                  Only this module has Save/Write functions
                                  Other modules read via exported Get functions
```

**Example from NP_OutlookTeamSuite:**
- `team_settings.json` — owned by `Team_Config.psm1`
- `utility_settings.json` — owned by `Utility_Config.psm1`
- `UserPref.json` — owned by the agent (any module reads, only agent writes)

**Why:** When multiple modules write to the same JSON, they overwrite each
other's changes.

**Controller check:** Identify config files in each project. Verify ownership is
documented and enforced.

---

### GLOBAL-010: PowerShell Strict Mode

**Rule:** All PowerShell modules (`.psm1`) and scripts (`.ps1`) MUST enable:

```powershell
Set-StrictMode -Version Latest
```

**Consequences to handle:**
- `$hashtable.Key` throws if Key doesn't exist → use `$ht.ContainsKey("Key")`
  before access
- Uninitialized variables throw → always declare with `$null` or default
- History values from JSON are `PSCustomObject` not `Hashtable` →
  use `$entry.Note = "..."` (property set), not `$h["Note"]` (indexer)

**PS Approved Verbs:** All functions must use approved verbs (`Get-`, `Set-`,
`Invoke-`, `Save-`, `Show-`, `Write-`, `Switch-`, `New-`, `Remove-`, etc.).
Use `Get-Verb` to see the full list.

**Why:** Without StrictMode, typos in variable names silently produce `$null`
instead of errors.

**Controller check:** Grep for missing `Set-StrictMode` in `.ps1` and `.psm1`
files. Flag any files missing it.

---

### GLOBAL-011: Gitignore Runtime & Sensitive Data

**Rule:** Every project MUST have a `.gitignore` that excludes:

| Category | Patterns |
|----------|----------|
| Runtime output | `report/*.json`, `report/*.html`, `report/*.xlsx` |
| Python artifacts | `__pycache__/`, `*.pyc`, `.venv/`, `*.egg-info/` |
| IDE files | `.vscode/` (unless sharing launch.json), `.idea/` |
| Credentials | `credentials/`, `*.key`, `.env`, `*secret*` |
| OS artifacts | `Thumbs.db`, `.DS_Store`, `desktop.ini` |
| Build output | `dist/`, `build/`, `*.dll` (unless intentional) |

**Sensitive data rule:** Files containing emails, API keys, contact lists, or
PII MUST be gitignored. If accidentally committed, notify the Designer immediately
— `git filter-branch` or `BFG` may be needed.

**Why:** Stantec corporate data (contact lists, project names) must not end up
in public GitHub repos.

**Controller check:** Verify `.gitignore` exists and covers the categories above.

---

### GLOBAL-012: Cross-Project Awareness in Mono-Repos

**Rule:** When multiple projects share a git repo (mono-repo), each project's
branch MUST NOT touch files belonging to another project.

**Enforcement:**
- `git add` must specify exact paths — never `git add .` or `git add -A` in
  a mono-repo root
- Before any git operation (`checkout`, `reset`, `rebase`), run `git status`
  and check for dirty files from other projects
- If dirty files from another project exist, **STOP** and notify the Designer

**Migration path:** When a sub-project reaches sufficient maturity, split it
into its own standalone repo. Document the split in both CLAUDE.md files.

**Why:** A branch revert in one project destroyed uncommitted work in another
(CatchmentDelin incident). This rule prevents that class of data loss.

**Controller check:** Identify mono-repos. Verify sub-projects have isolated
branch strategies or have been split out.

---

### GLOBAL-013: COM Object Lifecycle (PowerShell / Windows)

**Rule:** Any script opening Excel, Outlook, Word, or other COM objects MUST
use `try/finally` to guarantee cleanup on success, error, AND interruption.

```powershell
$app = $null; $wb = $null
try {
    $app = New-Object -ComObject Excel.Application
    $app.Visible = $false; $app.DisplayAlerts = $false
    $wb = $app.Workbooks.Open($path)

    # ... do work ...

} finally {
    if ($wb)  { try { $wb.Close($false) }  catch {} }
    if ($app) { try { $app.Quit() }         catch {} }
    @($wb, $app) | Where-Object { $_ } | ForEach-Object {
        try { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($_) } catch {}
    }
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
```

**Rules:**
- **Always use try/finally** — catch alone does not run on termination/Ctrl-C
- **Always call `$app.Quit()`** before ReleaseComObject — ReleaseComObject alone
  does NOT kill the Excel/Outlook process
- **Always GC flush** after releasing — forces .NET to drop lingering RCW handles
- **Never use inline COM scripts** (heredoc / -Command string) — they bypass
  module-level `Remove-ComObjects` and leave ghost processes
- **Prefer module functions** (`Remove-ComObjects`, `Clear-OfficeGhosts`) over
  manual Marshal calls in ad-hoc scripts
- Call `Clear-OfficeGhosts` before opening a COM object if prior runs may have
  leaked — ghost processes lock files and prevent re-open

**Why:** Ghost processes lock files and prevent re-open; always clean up.

**Controller check:** Grep for `New-Object -ComObject` across PowerShell repos.
Verify each occurrence is inside a `try/finally` block.

---

### GLOBAL-014: Backup Before Config Change

**Rule:** Before altering ANY config file (settings.json, CLAUDE.md, skills,
keybindings, PowerShell profile, .npmrc, etc.):
1. Copy the original to `~/.claude/backups/` with a timestamp suffix:
   `<filename>_YYYY-MM-DD_HHmm.<ext>`
2. Only then make the change
3. Only ADD to existing configs — never remove existing entries unless the user
   explicitly says "remove" AND backup has been confirmed

**Applies to:**
- `~/.claude/settings.json`
- `~/.claude/CLAUDE.md`
- `~/.claude/keybindings.json`
- `~/.claude/skills/**` and `~/.claude/commands/**`
- PowerShell profile (`$PROFILE`)
- Any project-level `.claude/` files

**Why:** Config files carry accumulated knowledge. Accidental overwrites destroy
months of preferences with no recovery path.

---

### GLOBAL-015: Leaflet HTML Map Standards & North Arrow

**Rule:** Every interactive HTML map (Leaflet, folium, or any web-map library)
MUST include the following controls.

**Required basemaps (toggled via layer control):**

| Layer | Source | Default |
|-------|--------|---------|
| USGS Topo | `basemap.nationalmap.gov` | OFF |
| Esri Hillshade | `arcgisonline.com/World_Hillshade` | OFF |
| Street Map (OSM) | `tile.openstreetmap.org` | varies |
| Satellite (Esri) | `arcgisonline.com/World_Imagery` | varies |

No API keys required — prefer Esri World Imagery over Bing.

**Required controls:**

| Control | Position | Behavior |
|---------|----------|----------|
| **Opacity panel** | top-right | Per-layer range sliders (0-100%) |
| **Print / Save** | top-left | Calls `window.print()`, hides controls during print |
| **Compass / North Arrow** | see below | SVG with True North + Site North arrows |

**Compass / North Arrow spec:**

| Component | Color | Behavior | Label |
|-----------|-------|----------|-------|
| **True North (TN)** | Blue (`#0f4c81`) | Fixed — always points up | "N" |
| **Site North (SN)** | Red (`#d9381e`) | Rotatable — syncs with site rotation | "F" or "SN" |

**SVG structure:**
```
<svg viewBox="0 0 40 54">
  <!-- True North: blue diamond, fixed -->
  <polygon points="20,5 17,25 20,23 23,25" fill="#0f4c81"/>
  <text>N</text>
  <!-- Site North: red arm, rotatable via transform="rotate(angle 20 25)" -->
  <g id="siteNorthArm" transform="rotate({angle} 20 25)">
    <polygon fill="#d9381e"/>
    <text>F</text>
  </g>
  <circle cx="20" cy="25" r="2.5"/>
</svg>
```

**Rotation sync rules:**
- **Static maps** (folium/Python): Site North set to `site_north_deg` from
  calibration JSON, fixed after render
- **Interactive maps** (JS engine): Site North updates live via `updateNorthArrow()`
  `rotation = atan2(-cos(rad), -sin(rad)) * 180 / PI`
- **Calibration tools**: dragging Site North syncs back to rotation slider

**JS template injection rule:**
- Use `__TOKEN__` replacements (e.g., `__SITE_NORTH_DEG__`), NOT `.format()` or
  f-strings — JS template literals contain `{}` which conflict
- Never strip non-tooltip `<style>` tags — they control polygon/path rendering

**Controller check:** Any HTML file containing `L.map` or `folium` must have a
compass SVG. Flag maps missing the north arrow.

---

### GLOBAL-016: User Preference Tracking (UserPref.json)

**Rule:** Every project SHOULD have a `UserPref.json` at project root that
records corrections and preferences the Designer has given. The Controller
maintains a global `config/global_pref.json` for cross-project preferences.

**Two tiers:**

| Tier | File | Scope | Git tracked? |
|------|------|-------|-------------|
| Global | `NP_ClaudeAgent/config/global_pref.json` | All projects | Yes |
| Project | `{project}/UserPref.json` | That project only | Yes |

**Format:**
```json
{
  "version": 1,
  "updated": "2026-03-26",
  "preferences": {
    "keyword-name": {
      "rule": "What the agent must do",
      "why": "What correction triggered this",
      "date": "2026-03-26"
    }
  }
}
```

**Agent behavior:**
1. **Before declaring done:** Read `UserPref.json` and `global_pref.json`. Verify
   changes don't violate any stored preference.
2. **When corrected:** Add a new keyword to the appropriate tier.
3. **Keywords grow only:** Never remove a keyword unless the Designer explicitly
   says to.

**Relationship to Claude memory:** `UserPref.json` is explicit, version-controlled,
always available, and survives machine changes via git. Use both — memory for
nuanced context, UserPref for hard rules.

**Controller check:** Verify `UserPref.json` exists in active projects.

---

### GLOBAL-017: File Header — Brief Description in Every Code File

**Rule:** Every code file MUST begin with a brief header describing what the
file does. No exceptions — all languages.

**Format by language:**

**Python (.py):**
```python
"""module_name.py — Brief description of what this file does."""
from __future__ import annotations
```

**PowerShell script (.ps1):**
```powershell
<#
.SYNOPSIS
    Script_Name.ps1 — Brief description.
#>
```

**PowerShell module (.psm1):**
```powershell
<#
.SYNOPSIS
    Module_Name.psm1 — Brief description of what this module provides.
#>
```

**CMD (.cmd / .bat):**
```batch
@echo off
REM ============================================================
REM  Script_Name.cmd — Brief description. Pairs with: Script_Name.ps1
REM ============================================================
```

**JavaScript (.js):**
```javascript
/** engine-name.js — Brief description. */
```

**HTML (.html):**
```html
<!-- page-name.html — Brief description. Generated by: <script> -->
```

**AutoLISP (.lsp):**
```lisp
;;;------------------------------------------------------------
;;; filename.lsp — Brief description. Commands: CMD1, CMD2
;;;------------------------------------------------------------
```

**C# (.cs):**
```csharp
// ClassName.cs — Brief description.
```

**Rules:**
- First line after comment opener: `filename.ext — description`
- Description starts with a verb: "Orchestrates...", "Parses...", "Exports..."
- Max 1 sentence for the synopsis line

**Controller check:** Scan first 5 lines of every tracked code file. Flag any
without a description header.

---

### GLOBAL-019: Reference Folder & Best Practices

**Rule:** Every repo MUST have a `reference/` folder at the repo root.

**Structure:**
```
{repo}/reference/
  best-practices/          # Synced by Controller (CTRL-004) — identical across all repos
    python.md              # Python naming, imports, style, anti-patterns
    github.md              # Branch naming, commits, PRs, Actions, .gitignore
    claude-agent.md        # CLAUDE.md structure, CTRL-005 protocol, completion, authority
  {project-specific}       # Owned by project agent — unique per repo
```

**Rules:**
- `reference/best-practices/` is Controller-managed — agents MUST NOT edit these files
- Project-specific reference docs go directly in `reference/`
- Every agent MUST follow the best practices in `reference/best-practices/`
- CTRL-004 Baseline Push syncs `best-practices/` to all repos — one source of truth

**Canonical source:** `NP_ClaudeAgent/reference/best-practices/`

---

### GLOBAL-021: Git-Track All Operational Files

**Rule:** All controller notes, reference docs, reports, and memory files MUST be
git-tracked and pushed to the remote repository. This enables web-based Claude
agents to read notes and sync with local plans.

**What must be tracked:**
- `controller-note/` — all upnotes, `.ping`, `.last-read` files
- `controller-note/controller-remote-note.md` — bridge for web Claude sync
- `reference/` — all reference docs and best practices
- `report/` — all reports, session logs, global rules
- `.claude/CLAUDE.md` — project instructions

**Protocol:**
1. After writing any operational file, stage and commit
2. Push to remote before session ends — web Claude cannot read unpushed files
3. `controller-remote-note.md` is the bridge: local agent writes, web agent reads

**Controller-Remote-Note Protocol:**
- File: `controller-note/controller-remote-note.md` (rolling, newest at top)
- Written by local Controller after each session with summary, repo status,
  pending action items, architecture decisions
- Web agent reads via GitHub MCP; writes responses back; touches `.ping`

**Why:** Web Claude can only access files via GitHub MCP. If notes are not pushed,
the web agent operates blind.

---

### GLOBAL-022: Dev-Check & Logic-Check Standard

*Consolidates former GLOBAL-022 (Dev-Check Quality Gate) and GLOBAL-026
(Dev/Logic-Check available to all repos) — requirement + access in one place.*

#### Part A — Dev-Check (review completed work)

**Rule:** Every repo MUST run Dev-Check before any major milestone: new module,
version tag, architecture change, or new sub-agent.

**When to trigger:**
- New sub-agent or module added
- Version tag (v0.X.0 or higher)
- Architecture change
- Any change touching safety, security, or authority rules
- Before merging a feature branch with 5+ new files

**Protocol:**
1. Assign a reviewer persona from the 32-persona roster (role + experience + focus)
2. Review ALL target files from that persona's specific perspective
3. Log bugs: `DEV-XXX | severity | category | description | file:line`
4. If bugs found: fix all, run tests, reset consecutive clean counter to 0
5. If clean round: increment consecutive clean counter
6. Repeat until **10 consecutive clean rounds** achieved (max 50 rounds)
7. Generate final report

**Severity levels:**

| Level | Meaning |
|-------|---------|
| critical | Architecture violation, security risk, data loss potential |
| high | Incorrect behavior, missing error handling, doc lies |
| medium | Style inconsistency, suboptimal patterns, missing tests |
| low | Nitpicks, minor type hints, cosmetic issues |

**32 Reviewer Personas (rotate through):**
1. Senior Python Developer (10yr) — code correctness, idioms, edge cases
2. Junior Developer (1yr) — readability, naming, confusing patterns
3. Security Engineer (7yr) — injection, auth, secrets, blast radius
4. QA Tester (5yr) — edge cases, falsy values, error paths
5. DevOps / CI Engineer (6yr) — CI/CD, workflow, deployment safety
6. Non-Technical PM (8yr) — docs, wording, logical flow, intention
7. Software Architect (12yr) — architecture, patterns, separation of concerns
8. Code Reviewer/Nitpick (4yr) — style, unused imports, type hints
9. Test Engineer (5yr) — coverage, missing tests, test quality
10. Technical Writer (6yr) — docs, comments, help text, handoff notes
11. Windows Platform Engineer (8yr) — PATH, encoding, platform-specific
12. Performance Engineer (7yr) — O(n), memory, sequential vs parallel
13. Accessibility/UX Reviewer (3yr) — output readability, error messages
14. Data Engineer (6yr) — data flow, serialization, config loading
15. Compliance Auditor (5yr) — safety contracts, authority, data policy
16. API Design Reviewer (8yr) — function signatures, return types, consistency
17. Error Path Specialist (4yr) — exception handling, missing validation
18. Defensive Programming Reviewer (6yr) — shared mutable state, defaults
19. Module Import Auditor (3yr) — circular imports, dead imports
20. Regression Tester (5yr) — did fixes break existing behavior?
21. Cross-Module Consistency Checker (7yr) — naming, patterns, model placement
22. Concurrency Reviewer (6yr) — thread safety, race conditions
23. Logging Reviewer (4yr) — log levels, noise, actionable messages
24. Python 3.10 Compatibility Tester (3yr) — type syntax, future imports
25. Version/Release Reviewer (5yr) — version strings, tags, changelogs
26. Packaging Reviewer (4yr) — pyproject.toml, deps, entry points
27. Edge Case Specialist (6yr) — empty inputs, None, zero, boundary
28. Configuration Management (5yr) — defaults, overrides, fallback chains
29. Business Logic Reviewer/PM (5yr) — does it match the stated purpose?
30. Fresh Graduate Developer (0yr) — is it understandable? confusing?
31. Infosec Auditor (8yr) — public exposure, tokens, data leaks
32. Designer/Owner/Intention (10yr) — does it match the vision?

**CLI (from any repo with Controller pipeline):**
```bash
py -m src.main dev-check --target "Feature X" --max-rounds 50 --clean-goal 10
```

#### Part B — Logic-Check (validate proposed plans)

**Rule:** Before any major restructuring, migration, new repo creation, or
architectural decision with significant blast radius, run Logic-Check.

**When to use:**
- Before creating a new repository or major restructuring
- Before migration, consolidation, or archival operations
- Before adopting new tools, patterns, or architectural changes
- When the Designer says "logic-check this"

**How it differs from Dev-Check:** Dev-Check reviews COMPLETED work for quality
(looks backward). Logic-Check validates PROPOSED plans for soundness (looks forward).
Same 32-persona engine, different purpose.

**Protocol:** Same structure as Dev-Check but uses strategic thinker personas
(Systems Architect, Devil's Advocate, Budget Owner, Chaos Engineer, Minimalist,
etc.). 10 consecutive clean rounds = plan validated.

**CLI:**
```bash
py -m src.main logic-check --target "Consolidate 3_PS into new repo"
```

#### Part C — Available to All Agents (no Controller code needed)

**Rule:** Dev-Check and Logic-Check protocols are available to any project agent,
not just the Controller. Any agent may run multi-persona review on its own codebase.

**How:** The protocol text and persona list are defined in this registry. Agents
follow the protocol manually — assign persona, review, log findings, iterate.
The Controller's `src/dev_check/` and `src/logic_check/` modules are reference
implementations; agents don't need to import them.

**Trigger phrases** (see GLOBAL-024 for full list):
- `dev-check` / `quality check` — run Dev-Check on current repo
- `logic-check` / `validate plan` — run Logic-Check on a proposed plan

---

### GLOBAL-024: Recognized Trigger Phrases

**Rule:** All agents (local, remote, cloud) and the Controller MUST recognize
these trigger phrases from the Designer. When spoken, execute immediately — no
clarification needed. This is the single authoritative list.

**Controller trigger phrases (NP_ClaudeAgent):**

| Phrase | Action |
|--------|--------|
| `check controller note` / `check notes` | Read controller-upnote.md across all repos, report new entries |
| `check ping` / `check pings` | Scan `.ping` vs `.last-read` across all repos, announce unread |
| `verify dispatch` | Scan all repos for `[DISPATCH-DONE]` commits, validate quality |
| `controller status` / `ecosystem status` | Full health summary: repo count, compliance, uncommitted, pings |
| `remote status` | Check if Remote Controller (CTRL-008) process is alive |
| `repo sync` | Run CTRL-001 through CTRL-004 batch loop |
| `cloud-kill` | Force-kill OneDrive sync (GLOBAL-025), re-run even if already ran this session |

**Project agent trigger phrases (any project repo):**

| Phrase | Action |
|--------|--------|
| `controller dispatch` / `check with controller` | Read controller-upnote.md, execute pending tasks |
| `check controller note` / `check notes` | Read controller-upnote.md for this repo only |
| `check ping` | Check `.ping` vs `.last-read` for this repo only |
| `session exit` | Run GLOBAL-006 Part C exit checklist |
| `cloud-kill` | Kill OneDrive sync (GLOBAL-025), re-run even if already ran |
| `dev-check` / `quality check` | Run Dev-Check multi-persona review (GLOBAL-022 Part A) |
| `logic-check` / `validate plan` | Run Logic-Check on a proposed plan (GLOBAL-022 Part B) |
| `log-chat` / `archive session` | Archive current session (CTRL-012) |
| `check logs` / `session history` | Read session log (CTRL-012) |

**CTRL-008 automated notifications (not user-triggered):**

| Event | Target |
|-------|--------|
| LAUNCHED | GitHub Issue #14 comment |
| CRASHED (with exit code) | GitHub Issue #14 comment |
| RELAUNCHED (watchdog recovery) | GitHub Issue #14 comment |

**Why:** Formalizes what every agent must respond to. Designer never has to
remember exact syntax.

---

### GLOBAL-025: Cloud-Kill — Kill OneDrive Sync Before Any Session

**Rule:** Before performing ANY git operation or file modification, every agent
MUST check if OneDrive is running and kill it if so.

**Implementation:**
- **Controller (NP_ClaudeAgent):** `src/cloud_kill/cloud_kill.py` — runs as
  Agent 00 (Step 00) before any CTRL function. Session marker prevents re-running
  within 1 hour.
- **All other agents:** At session start:
  ```
  tasklist /FI "IMAGENAME eq OneDrive.exe" /NH
  ```
  If found:
  ```
  taskkill /F /IM OneDrive.exe
  ```

**Trigger phrase:** `cloud-kill` — re-run on demand, even if already ran.

**Why:** OneDrive on Stantec corporate network continuously syncs files in
real-time. When git writes to `.git/objects/` or stages files, OneDrive locks
them mid-write causing `git add` failures, corrupt pack files, and file handle
conflicts.

**Applies to:** All repos on OneDrive-synced paths.

---

### GLOBAL-027: Credential & Secret Hygiene — No Leaks at Any Scale

**Rule:** No agent, controller, or automated process may expose credentials,
tokens, session IDs, API keys, or any secret material in output, logs, notes,
upnotes, terminal output, or committed files. This is a HARD rule — no exceptions.

**What counts as a secret:**
- API keys, PATs, OAuth tokens
- Claude SDK session IDs (`cse_*`), SDK URLs containing session identifiers
- GitHub tokens (`ghp_*`, `gho_*`, `github_pat_*`)
- `.env` file contents, connection strings, passwords
- Private key material, certificate contents

**Prohibited actions:**
1. **Process inspection with raw output** — never dump full `CommandLine` from
   `wmic`, `tasklist /V`, or `Get-Process`. Filter to PID + process name only.
2. **Logging secrets** — never write tokens to any log, upnote, or committed file.
3. **Committing secrets** — `.env`, `*.pem`, `*.key`, `credentials.json` must be
   in `.gitignore`.
4. **Passing secrets in upnotes** — controller-note files are committed and synced.
   Never include tokens.
5. **Screenshot-visible secrets** — avoid displaying secrets in terminal output.
6. **Windows secret-file sweeps** — NEVER scan for `.env`/`.pem`/`.key` filename
   patterns using `find.exe`, subprocess `find`, or glob-style hunting. This
   triggers Microsoft Defender T1552.004 (Private Keys) and escalates to SOC.
   CTRL-011 (Security-Check) is intentionally retired for this reason.

**Scale consequences:**
- One leaked PAT = access to ALL repos in the org
- More repos = more tokens, more places secrets can leak
- OneDrive sync can push secrets to cloud before `.gitignore` catches them
- Corporate endpoint security (Stantec) flags patterns — false alarms erode IT trust

**Required safeguards:**
1. **Redaction pattern:** `s/(cse_|ghp_|gho_|github_pat_|sk-)[a-zA-Z0-9_-]+/\1***REDACTED***/g`
2. **Pre-commit scanning:** `.gitignore` must cover `.env`, `*.pem`, `*.key`,
   `credentials.json`, `.mcp.json`
3. **Upnote hygiene:** Before writing to controller-note, verify no secret patterns
4. **Process queries:** Use `tasklist` (name + PID only)
5. **Cloud MCP boundary:** Cloud Controller must never push files containing local
   secrets

**Incident response:**
- If exposed in output: assess if it left the machine, rotate if needed
- If exposed in committed file: `git filter-branch` or `git filter-repo` to
  purge, then rotate
- If IT flags it: explain the tool, confirm no data exfiltration

---

### GLOBAL-028: Stale Artifact Hygiene — Detect, Archive, and Keep Active Paths Clean

**Rule:** Every repo MUST enforce stale-artifact hygiene. Stale generated files,
legacy backup artifacts, and old naming drift in active source paths must be
detected on a fixed cadence, archived (not deleted), and kept out of active
working paths.

**Scope:** Active source/config paths only. Historical logs and archived folders
are excluded from lint failures.

**Canonical stale-artifact targets (minimum):**
- Backup artifacts in active paths: `*.bak`, `*.old`, `*.orig`, `*~`
- Accidental duplicate/edit artifacts: `*.tmp`, `*.copy`, `*.rej`
- Stale generated placeholders in active config/source paths
- Legacy-name drift strings in active source/config files after approved rename

**Archive policy (no-delete default):**
- Move stale artifacts to `config/archive/YYYY-MM-DD_reason/` or
  `report/archive/YYYY-MM-DD_reason/` depending on artifact type
- Never hard-delete by default; deletion requires explicit Designer approval
- Keep a short archive note (`README.md`) with source path, date, and reason

**Mandatory scan cadence:**
1. At session start (quick hygiene scan)
2. Before milestone commit / baseline push
3. Weekly during active development

**Baseline lint behavior:**
- Lint excludes: `report/archive/**`, `config/archive/**`, `chat-history/**`,
  and historical upnotes/logs
- Lint fails on active-path inconsistencies (examples: stale `.bak` in active
  folders, legacy project name references in active source/config)

**Controller dispatch template (hygiene-specific):**
```markdown
## [YYYY-MM-DD HH:MM] HYGIENE DISPATCH — stale artifact cleanup -- UPDATE

Required:
1. Scan active paths for stale artifacts and legacy-name drift
2. Move stale items to archive folder (no-delete default)
3. Re-run lint excluding archive/history paths
4. Commit with summary + touch controller-note/.ping
```

**Why:** Checklist-only compliance misses practical repo hygiene issues.
Standardizing stale-artifact detection and archive policy prevents recurring
drift, noisy scans, and accidental edits against obsolete files.

---

### GLOBAL-029: Cross-Platform Mandatory (XPLAT-001)

**Rule:** Every module that touches OS-level operations (process management,
file paths, subprocess calls, keep-alive agents, CLI discovery) MUST work
on **both Windows and Linux**. The Controller runs on Windows locally and
on Linux when accessed via remote CLI (phone/web). Silent platform failures
are FORBIDDEN.

**Specific requirements:**
1. **Never** gate functionality behind `if os.name == "nt"` with a bare
   `return` / `return None` / `pass` on the else branch. Every platform
   gate MUST have a working implementation for BOTH branches.
2. **Process detection:** WMIC on Windows, `ps aux` on Linux. Always
   include PID-file fallback as a safety net on both platforms.
3. **Keep-alive / nudge agents:** Must run as independent detached
   subprocesses. On Linux: Python heartbeat subprocess. On Windows:
   PowerShell agent.
4. **CLI discovery:** Must include Linux paths (`~/.local/bin/claude`,
   `/usr/local/bin/claude`) alongside Windows paths.
5. **Process kill:** `os.kill(signal.SIGTERM)` on Linux, `taskkill` on Windows.
6. **Tests must exercise both platform branches** — mock `os.name` to
   `"nt"` and `"posix"` separately. A test that only mocks one platform
   is incomplete.

**Enforcement:** `tests/test_xplat_guard.py` uses AST analysis to scan all
`src/` Python files for platform-gated code with dead else branches. This
test runs as part of the standard test suite and blocks commits on violation.

**Canonical pattern:** See `src/remote_invoke/remote_invoke.py` — split
platform-specific code into `_foo_nt()` and `_foo_posix()` helper functions,
called from a single public function that dispatches on `os.name`.

**Why:** The Controller is accessed from phone via remote CLI (Linux env).
Platform-gated code with silent no-ops caused repeated "spinning" failures
on connect — the process detection, keep-alive, and status reporting all
silently returned empty/None on Linux, making the remote session appear
unresponsive.

---

## 2. CONTROL RULES — The Controller Functions

The Controller has eleven core functions across eight orchestras.

---

### CTRL-001: Harvest

**What:** Scan all repos. Produce a complete inventory.

**Process:**
1. Walk all project directories
2. For each git repo: record name, last commit date, active branch, commit count;
   check for CLAUDE.md, `report/`, `.gitignore`
3. Sort: Recent (active <3 weeks) vs Old; With CLAUDE.md vs Without
4. Flag anomalies: duplicate repos, nested repos, orphan branches, mono-repos

**Output:** Harvest report in `report/`.

---

### CTRL-002: Cross-Check

**What:** Read all CLAUDE.md files, identify best patterns across projects.

**Process:**
1. Read every CLAUDE.md from the Harvest
2. Score each: Project Goal, Completion Protocol, Handoff Notes, Safety Contract,
   domain knowledge, past mistakes documented
3. Compare across projects: shared patterns (global candidates) vs unique (keep local)
4. Identify the "best version" of each shared pattern

**Output:** Cross-check report — per-project scorecard + best-pattern catalog.

---

### CTRL-003: Analyze & Discuss

**What:** Compare cross-check findings against global rules. Identify gaps,
propose new rules, discuss with Designer.

**Process:**
1. Compare findings against each GLOBAL rule
2. Classify each: Compliant / Gap / New pattern / Conflict
3. Draft proposals for Designer approval
4. Designer approves, modifies, or rejects each proposal
5. Approved changes logged in Rule Change Log (Section 3)

**Key principle:** Controller does NOT unilaterally adopt rules. Every new rule
requires Designer approval.

---

### CTRL-004: Baseline Push

**What:** Write baseline standard sections into each project's CLAUDE.md.

**Current baseline (rules marked for push):**

| Rule | What gets written |
|------|-------------------|
| GLOBAL-001 | `## Project Goal` section |
| GLOBAL-002 | File encoding rules |
| GLOBAL-003 | Branch naming convention |
| GLOBAL-005 | `report/` folder convention |
| GLOBAL-006 | Completion Protocol + Session Exit checklist |
| GLOBAL-007 | Handoff Notes template |
| GLOBAL-011 | `.gitignore` baseline patterns |
| GLOBAL-016 | `UserPref.json` template |
| GLOBAL-017 | File header standard |
| GLOBAL-019 | `reference/best-practices/` folder |
| GLOBAL-022 | Dev-Check Quality Gate section |
| GLOBAL-028 | Stale-artifact hygiene section |
| GLOBAL-029 | Cross-platform mandatory (XPLAT-001) |

**Process:**
1. Read current CLAUDE.md; identify missing baseline sections
2. Inject missing sections — never overwrite existing project-specific content
3. For projects without CLAUDE.md: generate new with all baseline sections as TODOs
4. Commit: `"Add baseline standards (Controller CTRL-004 push)"`

**Guard rails:** Controller may ONLY add baseline sections. Never edit
project-specific content without Designer approval.

---

### CTRL-005: Controller Communication Layer

*Consolidates former CTRL-005 (Controller-Note Protocol), CTRL-006 (Rule
Versioning), and CTRL-007 (Report Format) — all three are the communication layer.*

#### Part A — Controller-Note & Ping Protocol

**Rolling file format (ALL repos):**
- Each repo: ONE file `{repo_name}-upnote.md` — newest entries at top
- Controller: `controller-upnote.md` in each target repo
- Entry format: `## [YYYY-MM-DD HH:MM] Subject -- TYPE`
- Resolved items: ~~strikethrough~~
- Location: `controller-note/` folder at repo root

**Auto-ping mechanism:**
- `.ping` file touched on every write — mtime signals new content
- `.last-read` file updated after reading — compare vs `.ping` for unread
- GitHub Actions `repository_dispatch` for remote ping (repos with workflows)
- Ping applies BOTH directions: controller → project AND project → controller

**Protocol:**
1. **Auto-check at session start:** Check `.ping` mtime vs `.last-read` — automatic
2. **Pre-action gate:** Before performing any new user-requested action, check `.ping` mtime vs `.last-read`.
  If unread ping exists, read and acknowledge it first.
3. **Agent writes on change:** Append to `{repo_name}-upnote.md` + touch `.ping`
4. **Controller writes on change:** Append to `controller-upnote.md` in target repo.
   Two cases only: (a) `global_update` — a GLOBAL rule changed; (b) `override` —
   Designer-authorized override with justification
5. **No silent changes:** Any cross-scope change MUST have upnote + ping
6. **Ping acknowledgment (MANDATORY):** When `.ping` is unread, the agent MUST
  announce to user, read the upnote, touch `.last-read`, and respond if needed.
  If the agent is currently in the middle of an atomic action, it MUST finish
  that step and then check ping immediately on the next user prompt trigger with
  an announcement like: "seems like I got a ping from {repo} — let me go check now."
  Pings must NEVER be silently ignored.
7. **Mid-session re-scan:** After every major task, re-scan all repos for new pings

**CLI:**
```bash
py -m src.main controller-note --scan
py -m src.main controller-note --write --subject "..." --body "..." --note-type global_update
py -m src.main controller-note --repo ProjectBook-Planner
```

#### Part B — Report Format

All Controller reports use the same structure:
```markdown
# Report Title
**Date:** YYYY-MM-DD
**Scope:** <what was scanned>

## Findings
<numbered findings with severity: HIGH / MEDIUM / LOW>

## Recommendations
<actionable next steps>
```

Reports are always written to `report/` in NP_ClaudeAgent.

#### Part C — Rule Versioning

When a global rule is added, modified, or removed:
1. Update this document
2. Log the change with date and reason in Section 3
3. Designer must approve before the rule takes effect
4. If the rule is part of the baseline (CTRL-004), schedule a baseline push
5. Write a `controller-upnote` documenting the change

---

### CTRL-006: Git-Projection (Remote Launch)

**What:** Trigger and verify HTML mirror workflows — publish built output from a
private repo to a public GitHub Pages repo.

**Process:**
1. Verify `Output/` or `docs/` contains the latest built HTML
2. Trigger GitHub Actions workflow via `repository_dispatch`
3. Poll for workflow completion (up to `--timeout` seconds)
4. Verify public mirror files exist at the GitHub Pages URL
5. Report: repo, trigger status, build status, verify status

**CLI:**
```bash
py -m src.main launch --project ProjectBook-Planner
py -m src.main launch --project ProjectBook-Planner --no-wait
py -m src.main launch --project ProjectBook-Planner --verify-only
```

**Guard rails:** Requires Designer authorization for each new mirror target.
Never include secrets, PII, or internal paths in public HTML.

**Note:** CTRL-006 number reused — old CTRL-006 (Rule Versioning) was absorbed
into CTRL-005 during 2026-03-26 consolidation. This definition was added 2026-04-01.

---

### CTRL-007: DevMilestoneCheck (Dev-Check)

**What:** Multi-persona quality review protocol for milestone commits and PR merges.
Looks BACKWARD at completed work (contrast with CTRL-010 which looks forward at
proposed plans).

**Protocol:**
- 32 reviewer personas covering: architecture, security, UX, performance,
  accessibility, test coverage, docs completeness, and more
- Minimum 10 consecutive clean rounds to pass
- Agent MUST auto-fix all CRITICAL/HIGH findings and re-run — do NOT return
  broken output to the user
- Only escalate to Designer if a finding requires external action or a design decision
- Log results in `report/`

**CLI:**
```bash
py -m src.main dev-check --target .
```

**Guard rails:** Never declare a milestone "done" without running this gate first.
See GLOBAL-022 for the full quality gate requirement.

**Note:** CTRL-007 number reused — old CTRL-007 (Report Format) was absorbed
into CTRL-005 during 2026-03-26 consolidation. This definition was added 2026-04-01.

---

### CTRL-008: Remote-Invoke

**What:** Launch and manage Claude CLI remote-control sessions with keep-alive
nudge to prevent Windows sleep during long-running orchestrations.

**CLI:**
```bash
py -m src.main remote-invoke --start --name NP_ClaudeAgent_Controller
py -m src.main remote-invoke --reinvoke --name NP_ClaudeAgent_Controller
py -m src.main remote-invoke --status
py -m src.main remote-invoke --stop --name NP_ClaudeAgent_Controller
```

---

### CTRL-009: Note-Verify

**What:** Round-trip ping/verify/commit orchestra.

**Process:**
1. Push upnote + touch `.ping` in all repos
2. Wait for agents to acknowledge (`.last-read` mtime update)
3. Verify response
4. Commit the verification result
5. Notify originator

**CLI:**
```bash
py -m src.main note-verify --subject "Baseline sync" --body "..."
py -m src.main note-verify --dry-run
```

---

### CTRL-010: LogicCheck

**What:** Strategic planning validation via multi-persona deliberation.
See GLOBAL-022 Part B for full protocol.

**CLI:**
```bash
py -m src.main logic-check --target "Consolidate 3_PS into new repo"
py -m src.main logic-check --target "..." --max-rounds 50 --clean-goal 10
```

---

### CTRL-012: Log-Chat

**What:** Session history archival across all repos. Dual storage: local memory
files + git-tracked rolling session log.

**CLI:**
```bash
py -m src.main log-chat --archive
py -m src.main log-chat --scan-gaps
```

---

## 2.5 SCALING ROADMAP — 7 to 50+ Repos

Current architecture (7 repos, single Controller, file-based polling) works today.
This section defines what changes are needed as repo count grows.

### Scaling Analogy

```
7 repos:   1 manager does everything (today)
15 repos:  manager needs team leads
30 repos:  team leads become department managers
50+ repos: director talks to managers, managers talk to employees
```

### Promotion Model: Orchestra → Group Controller

| Stage | What it is | Example |
|-------|-----------|---------|
| **Orchestra** | CTRL functions inside Master Controller | Repo-Sync runs CTRL-001-004 on all 7 repos |
| **Growing** | Group exceeds checkpoint threshold | LSP family hits 8 repos, scan takes >30s |
| **Promoted** | Orchestra becomes its own repo | `LSP_GroupController` — own CLAUDE.md, pipeline |
| **Under control** | Group controller reports to Master | Master reads group summary only |

### Scaling Checkpoints

#### SCALE-001: Repo Count

| Metric | Current | Threshold | Triggers |
|--------|---------|-----------|----------|
| Total repos | 7 | **10** | Phase 1 planning begins |
| Total repos | 7 | **15** | Phase 1 execution mandatory |
| Total repos | 7 | **20** | Phase 2 planning begins |
| Total repos | 7 | **30** | Phase 2 execution mandatory |
| Repos in one group | 5 (LSP) | **8** | That group gets its own controller |

#### SCALE-002: Performance

| Metric | Current | Threshold | Triggers |
|--------|---------|-----------|----------|
| Comparator time | ~6s | **30s** | Section-grouping optimization |
| Repo-sync full loop | ~20s | **120s** | Batch processing, parallel execution |
| `.ping` scan time | <1s | **5s** | Webhook-driven pings |
| Cloud MCP reads | 7 calls | **20 calls** | Cloud index file |

#### SCALE-003: Complexity

| Metric | Current | Threshold | Triggers |
|--------|---------|-----------|----------|
| GLOBAL rules count | 22 | **40** | Database-backed registry |
| global_rules lines | ~900 | **2500** | Split into sections or DB |
| controller-remote-note lines | ~130 | **300** | Cloud index file replaces raw note |
| Active orchestras | 6 | **10** | Re-evaluate delegation candidates |

#### SCALE-004: Operational Health

| Metric | Current | Threshold | Triggers |
|--------|---------|-----------|----------|
| Orphaned uncommitted repos | 0 (fixed) | **Any > 0** | GLOBAL-006 Part C enforcement review |
| Repos below 90% compliance | 0 (target) | **Any > 2** | Root cause investigation |
| Stale branches across all repos | ~6 | **20** | Batch cleanup sprint |
| Unread pings older than 24h | 0 | **Any > 3** | Communication protocol review |

### Checkpoint Response Protocol

1. Flag in upnote: `SCALE-00X threshold crossed: {metric} = {value}`
2. Reference this section
3. Present two options to Designer: Execute plan OR Brainstorm (plan may be outdated)
4. **Never auto-execute scaling changes** — Controller detects, Designer decides
5. Update this section after execution

### Phase 1: 7-15 repos

| Change | What | Trigger |
|--------|------|---------|
| GitHub App | Replace OAuth with GitHub App | SCALE-001 hits 10 repos |
| Comparator optimization | Section-grouping, O(n^2) → O(k*m^2) | SCALE-002 comparator >30s |
| Cloud index file | Single-table summary instead of N upnotes | SCALE-002 MCP reads >20 |

### Phase 2: 15-30 repos

| Change | What | Trigger |
|--------|------|---------|
| Group sub-controllers | Orchestras promoted to own repos | Any group >8 repos |
| Webhook-driven pings | `repository_dispatch` replaces `.ping` polling | Ping scan >5s |
| Batch Note-Verify | CTRL-009 parallel push, single wait | SCALE-001 hits 20 repos |

### Phase 3: 30-50+ repos

| Change | What | Trigger |
|--------|------|---------|
| Database-backed rules | SQLite/JSON DB replaces markdown registry | Rules >40 or lines >2500 |
| Controller dashboard | HTML status page for all repos | SCALE-001 hits 30 repos |
| Remote Controller API | CTRL-008 exposes API for Cloud | SCALE-001 hits 30 + Phase 2 done |

### Invariants (unchanged at any scale)
- Designer-Controller-Agent hierarchy
- GLOBAL rules as source of truth
- Per-repo `.claude/CLAUDE.md` for project-level rules
- CTRL-005 upnote communication pattern
- `controller-remote-note.md` as Cloud bridge (until API gateway replaces it)
- **Scaling changes require Designer approval — Controller detects, Designer decides**

---

## 3. RULE CHANGE LOG

| Date | Rule | Change | Reason |
|------|------|--------|--------|
| 2026-03-15 | GLOBAL-001 through GLOBAL-014 | Initial creation | Extracted from 3 project CLAUDE.md files + global CLAUDE.md |
| 2026-03-15 | GLOBAL-001 | Added periodic goal check-in (20 commits / new branch) | Goals drift over time |
| 2026-03-15 | GLOBAL-015 | Added Leaflet HTML Map + North Arrow standard | Designer directive + InteractiveParcelMap + CatchmentDelin implementations |
| 2026-03-15 | CTRL-001 through CTRL-007 | Initial Controller functions | Designer directive — Harvest → Cross-Check → Analyze → Baseline Push |
| 2026-03-15 | GLOBAL-016 | Added UserPref.json two-tier preference tracking | OutlookTeamSuite pattern promoted to global |
| 2026-03-15 | GLOBAL-017 | Added file header requirement | Every file must have a brief description |
| 2026-03-22 | GLOBAL-018 | Added HTML build verification | Broken HTML deploys caught only by visual check |
| 2026-03-22 | CTRL-005 | Added Controller-Note Communication Protocol | Enforce documented communication between all agents |
| 2026-03-22 | GLOBAL-019 | Added Reference Folder & Best Practices | Centralize best practices, sync via CTRL-004 |
| 2026-03-22 | GLOBAL-021 | Added git-track operational files + controller-remote-note | Enable web Claude sync via GitHub MCP |
| 2026-03-22 | GLOBAL-022 | Added Dev-Check Quality Gate as standard procedure | CTRL-007 must be standard, not optional |
| 2026-03-23 | CTRL-009 | Added Note-Verify round-trip orchestra | 6th orchestra: push ping → wait → verify → commit → notify |
| 2026-03-23 | GLOBAL-023 | Added Session Exit Rule | Audit found 5/7 repos with abandoned changes from remote/web sessions |
| 2026-03-23 | Section 2.5 | Added Scaling Roadmap (7 to 50 repos) | 3-phase plan from incremental to platform |
| 2026-03-23 | CTRL-010 | Added LogicCheck — strategic planning validation | Validate plans BEFORE execution |
| 2026-03-24 | GLOBAL-025 | Added Cloud-Kill | OneDrive file-locking caused git failures on corporate Windows |
| 2026-03-24 | GLOBAL-026 | Dev-Check and Logic-Check available to all repos | Agents can run multi-persona review without Controller code |
| 2026-03-24 | GLOBAL-024 | Added cloud-kill, dev-check, logic-check trigger phrases | All agents recognize these voice commands |
| 2026-03-24 | GLOBAL-027 | Added Credential & Secret Hygiene | wmic process dump exposed SDK session ID, triggered Stantec SOC alert |
| 2026-03-24 | CTRL-011 | Added Security-Check orchestra | Proactive secret & session hygiene monitor |
| 2026-03-24 | CTRL-012 | Added Log-Chat orchestra | Session history archival, dual storage |
| 2026-03-25 | CTRL-011 | **RETIRED** Security-Check orchestra entirely | SEC-003 gitignore-gap scan triggered Microsoft Defender T1552.004 SOC alert. All token/secret scanning via find.exe, subprocess find, or glob removed. Hard rule added to GLOBAL-027. |
| 2026-03-26 | ALL | **Consolidation** — 27 rules → 22 rules | GLOBAL-006 absorbs GLOBAL-018 + GLOBAL-023; GLOBAL-022 absorbs GLOBAL-026; GLOBAL-013/014 inlined; CTRL-005 absorbs CTRL-006 + CTRL-007; GLOBAL-003 typo fixed |
| 2026-03-27 | GLOBAL-028 | Added stale-artifact hygiene rule | ProjectBook-Planner escalation: enforce stale artifact scan cadence, archive policy, and active-path hygiene lint |
| 2026-03-27 | CTRL-005 Part A | Strengthened ping handling behavior | Added pre-action ping gate and mandatory next-prompt check behavior when ping is detected mid-action |
| 2026-04-02 | GLOBAL-029 | Added Cross-Platform Mandatory (XPLAT-001) | Remote CLI from phone = Linux env; platform-gated code with silent no-ops caused repeated session hanging. Enforced via AST-based test guard |

---

## 4. SOURCE TRACEABILITY

| Rule | Source |
|------|--------|
| GLOBAL-001 | Designer directive — 20-commit / new-branch check-in trigger |
| GLOBAL-002 | Designer directive + observed across all projects |
| GLOBAL-003 | CatchmentDelin_XML CLAUDE.md |
| GLOBAL-004 | OutlookTeamSuite CLAUDE.md — CMD/PS1 pairing, `%~dp0` |
| GLOBAL-005 | OutlookTeamSuite (`Report/`), CatchmentDelin (`report/`), LSP_Library (`reports/`) |
| GLOBAL-006 | OutlookTeamSuite (completion), CatchmentDelin (HTML verify), 2026-03-23 audit (session exit) |
| GLOBAL-007 | CatchmentDelin_XML CLAUDE.md — dated session handoffs |
| GLOBAL-008 | LSP_Library CLAUDE.md — read-only source library |
| GLOBAL-009 | OutlookTeamSuite CLAUDE.md — settings JSON ownership |
| GLOBAL-010 | OutlookTeamSuite CLAUDE.md — StrictMode + PSCustomObject rules |
| GLOBAL-011 | OutlookTeamSuite (`Report/` gitignored); LSP_Library (`reports/` gitignored) |
| GLOBAL-012 | CatchmentDelin_XML CLAUDE.md — urgent cross-project warning |
| GLOBAL-013 | Global `~/.claude/CLAUDE.md` — COM Object Guard (inlined 2026-03-26) |
| GLOBAL-014 | Global `~/.claude/CLAUDE.md` — Legacy Policy (inlined 2026-03-26) |
| GLOBAL-015 | InteractiveParcelMap `engine-map.js:99` + CatchmentDelin `export_map.py` |
| GLOBAL-016 | OutlookTeamSuite CLAUDE.md — `UserPref.json` + completion protocol |
| GLOBAL-017 | Designer directive — brief description header in every code file |
| GLOBAL-019 | Designer directive — centralize best practices in `reference/best-practices/` |
| GLOBAL-021 | Designer directive — all notes, reports, references pushed for web Claude MCP |
| GLOBAL-022 | Designer directive — CTRL-007 32-persona review is standard; agents can run without Controller code |
| GLOBAL-024 | Designer directive — formalize trigger phrases across all agents |
| GLOBAL-025 | Designer directive — OneDrive file-locking caused git failures on corporate Windows |
| GLOBAL-027 | Incident 2026-03-24 + 2026-03-25 — SOC alerts from process inspection and file sweep patterns |
| GLOBAL-028 | ProjectBook-Planner escalation 2026-03-27 — stale backups/artifact drift required standardized archive + lint policy |
