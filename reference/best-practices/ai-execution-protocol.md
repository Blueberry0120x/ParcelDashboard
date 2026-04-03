# AI Execution Protocol — Mandatory Runtime Directives

**This is not documentation. These are executable instructions.**
Every Claude instance (Local, Remote, Cloud) MUST follow these as hard constraints.
Violations mean the agent is broken, not that the rules are optional.

---

## HARD LOOP: Fix Until Clean

```
WHILE task_incomplete:
    execute(task_step)
    result = verify(task_step)
    IF result.has_errors:
        fix(result.errors)        # DO NOT RETURN TO USER
        CONTINUE                  # LOOP BACK — FIX IT YOURSELF
    ELSE:
        mark_complete(task_step)
        NEXT
```

**NEVER return errors to the user unless you cannot fix them.**
GLOBAL-006 says "fix before committing." GLOBAL-022 says "10 consecutive clean."
Both mean: LOOP. Do not ask. Do not report partial. Fix and reverify.

---

## SESSION LIFECYCLE (every session, no exceptions)

### On Start (BLOCKING — nothing else until done)
1. `py tools/session_guard.py` — enforces rules-first startup gate
2. Rule check first (`CLAUDE.md` and `report/global_rules.md` must exist)
3. Ping check second — read and acknowledge ALL unread pings
4. Check `controller-note/controller-remote-note.md` for cloud entries
5. Cloud-Kill: verify OneDrive is not running (`tasklist /FI "IMAGENAME eq OneDrive.exe"`)
6. If any of these fail: fix before proceeding

### During Session
- Before every new user-requested action: check `.ping` vs `.last-read`; if unread, read first
- After every commit, baseline push, or repo-sync: re-scan pings
- After every cross-repo write: update upnote + touch .ping
- Never leave errors unfixed — loop until clean
- Never guess data — use filesystem/API/CLI first
- Never skip self-check — run every new tool against own repo
- Bug found once → grep for same pattern everywhere
- If ping is detected while mid-action: finish the current atomic step, then on the next prompt trigger announce and check immediately

### On Exit (BLOCKING — nothing skipped)
1. `git status` — any uncommitted changes?
2. If yes: commit (with `[WIP]` prefix if incomplete), stash, or document in upnote
3. Touch `.ping` if any cross-repo notes were written
4. Archive session to `chat-history/session-log.md`
5. Push to remote

---

## VERIFICATION CHAIN (run after EVERY change)

```
1. py -m pytest tests/ -v              → ALL must pass
2. py -m src.main --repos "." --dry-run → pipeline must not crash
3. py -m src.main analyze --project X   → must score 100%
4. IF any fail → FIX → GOTO 1          → DO NOT RETURN TO USER
```

This is not optional. This is not "when you have time." This runs after
every code change, every config change, every baseline push.

---

## PROCESS INSPECTION (GLOBAL-027 — HARD RULE)

**NEVER** dump process command lines. Period.
- `wmic process get CommandLine` — FORBIDDEN
- `Get-Process | Select CommandLine` — FORBIDDEN
- `/proc/*/cmdline` — FORBIDDEN

**ONLY** allowed: `tasklist` (name + PID), `Get-Process | Select Id,ProcessName`

Tokens (`cse_*`, `ghp_*`, `sk-*`) must NEVER appear in:
- Terminal output
- Log files
- Upnotes
- Committed files
- Controller-note files

---

## BASELINE COMPLETENESS (what every repo MUST have)

### Folders
- `.claude/` with `CLAUDE.md`
- `.vscode/` with `settings.json` (TRACKED in git, not ignored)
- `controller-note/` with upnote + `.ping` + `.last-read`
- `reference/best-practices/` (synced by CTRL-004)
- `report/` (rolling format, no dated filenames)

### Files
- `.gitignore` with: `.env`, `.env.*`, `*.pem`, `*.key` (GLOBAL-027)
- `UserPref.json` (GLOBAL-016)

### CLAUDE.md Sections (all required, no TODO placeholders)
- Project Goal (GLOBAL-001)
- File Encoding (GLOBAL-002)
- Branch Naming (GLOBAL-003)
- Completion Protocol (GLOBAL-006)
- Safety Contract (GLOBAL-008)
- Handoff Notes (GLOBAL-007)
- Dev-Check Quality Gate (GLOBAL-022)
- Controller-Note Protocol (CTRL-005)

### What the Analyzer Checks
- GLOBAL-001 through GLOBAL-029
- If any check returns GAP → fix immediately → re-run → loop until 100%

---

## AUTHORITY MODEL (non-negotiable)

```
Designer (Owner) → final authority on everything
  └── Controller (NP_ClaudeAgent) → scans, reports, enforces
        └── Project Agents → follow global rules + local CLAUDE.md
```

- Global rule ALWAYS wins over project rule
- Controller NEVER overrides without Designer permission
- Conflicts → flag for Designer review → never resolve unilaterally
- New rules → propose to Designer → Designer approves → then enforce

---

## COMMUNICATION PROTOCOL (CTRL-005)

### Writing
- Every change → append to `{repo}-upnote.md` + touch `.ping`
- Cross-repo write → MUST update controller-upnote.md + touch .ping
- Cloud writes → MUST update `controller-remote-note.md` + push

### Reading
- Session start → auto-check `.ping` mtime vs `.last-read`
- Before each new action → re-check `.ping` vs `.last-read`
- If unread → announce → read → update `.last-read` → respond if needed
- If unread while busy → defer only to next prompt trigger, then announce "seems like I got a ping from {repo} — let me go check" and read first
- NEVER silently ignore a ping
- NEVER wait for user to say "check notes"

---

## TRIGGER PHRASES (GLOBAL-024 — execute immediately, no clarification)

| Phrase | Action |
|--------|--------|
| `check ping` | scan .ping vs .last-read, announce unread |
| `check notes` | read upnotes across all repos |
| `repo sync` | run CTRL-001 through CTRL-004 |
| `verify dispatch` | scan for [DISPATCH-DONE] commits |
| `controller dispatch` | read + execute pending tasks |
| `session exit` | run GLOBAL-023 exit checklist |
| `cloud-kill` | kill OneDrive sync |
| `dev-check` | run multi-persona review |
| `logic-check` | validate a proposed plan |
| `security-scan` | run CTRL-011 security check |
| `log-chat` | archive current session |

---

## ANTI-PATTERNS (things I keep doing wrong)

1. **Returning errors to user instead of fixing them** — LOOP AND FIX
2. **Saying 100% when checks are incomplete** — add missing checks FIRST
3. **Asking for confirmation when rules already authorize the action** — JUST DO IT
4. **Falling back to generic AI behavior instead of reading project rules** — RULES FIRST
5. **Ignoring .vscode/ and baseline folders** — check EVERYTHING
6. **Creating dated report files** — use rolling format
7. **Dumping process command lines** — PID + name ONLY
8. **Not verifying my own output** — always verify, always loop
9. **Over-confirming instead of executing** — GLOBAL-024 says "no clarification needed"
10. **Treating documentation as optional** — it's executable, not decorative

---

## CTRL FUNCTIONS QUICK REFERENCE

| CTRL | Name | Module | What |
|------|------|--------|------|
| 001 | Harvest | `src/repo_inspector/` | Scan repos, flag branch issues |
| 002 | Cross-Check | pipeline | Compare CLAUDE.md across repos |
| 003 | Analyze | `src/analyzer/` | Score compliance per GLOBAL rules |
| 004 | Baseline Push | `src/baseline/` | Inject missing sections |
| 005 | Controller-Note | `src/controller_note/` | Communication protocol |
| 006 | Remote Launch | `src/remote_launch/` | Mirror workflows |
| 007 | Dev-Check | `src/dev_check/` | Multi-persona quality review |
| 008 | Remote-Invoke | `src/remote_invoke/` | CLI remote-control + nudge |
| 009 | Note-Verify | `src/note_verify/` | Round-trip ping verification |
| 010 | Logic-Check | `src/logic_check/` | Strategic plan validation |
| 011 | Security-Check | `src/security_alert/` | Secret & session hygiene |
| 012 | Log-Chat | `src/log_chat/` | Session history archival |

---

## SCALING AWARENESS

Current: 7 repos. Thresholds:
- 10 repos → Phase 1 planning
- 15 repos → Phase 1 execution
- 8 repos in one group → group gets own controller
- Comparator > 30s → optimize
- NEVER auto-execute scaling changes → Designer decides
