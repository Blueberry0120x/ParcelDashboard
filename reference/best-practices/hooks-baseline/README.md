# Hooks Baseline v9 — Deployment Guide

Portable enforcement hooks, skills, and tools for all repos in the ecosystem.
Deployed via CTRL-004 Baseline Push and `/sync-hooks`.
Source of truth: `NP_ClaudeAgent/reference/best-practices/hooks-baseline/`

## Folder structure (v9+)

```
hooks-baseline/
  hooks/          → {repo}/.claude/hooks/      (16 hook scripts)
  skills/         → {repo}/.claude/commands/   (10 skill files)
  tools/          → {repo}/tools/              (session_guard_lite.py)
  settings.json.template  → merged into {repo}/.claude/settings.json
  VERSION
  README.md
```

**Rule:** source files live in the matching subfolder. `/sync-hooks` copies each subfolder to its destination. Future hooks go in `hooks/`, future skills in `skills/`, future tools in `tools/`.

## Hooks (`hooks/` → `.claude/hooks/`)

| File | Event | Rule | Behavior |
|------|-------|------|----------|
| `session_guard_lite.py` | — | — | lives in `tools/` (see below) |
| `block_find_exe.py` | PreToolUse(Bash) | GLOBAL-027 | BLOCK find.exe, secret-hunting, curl\|bash |
| `strictmode_check.py` | PreToolUse(Bash) | GLOBAL-010 | BLOCK commit if PS files lack StrictMode |
| `com_lifecycle_check.py` | PreToolUse(Bash) | GLOBAL-013 | BLOCK commit if COM objects lack try/finally |
| `branch_naming.py` | PreToolUse(Bash) | GLOBAL-003 | BLOCK invalid branch names |
| `pre_commit_guard.py` | PreToolUse(Bash) | GLOBAL-028 | BLOCK commits missing required gates |
| `backup_config.py` | PreToolUse(Edit\|Write) | GLOBAL-014 | Auto-backup config before edit |
| `secret_scanner.py` | PostToolUse(Bash) | GLOBAL-027 | WARN if tokens detected in output |
| `upnote_reminder.py` | PostToolUse(Bash) | CTRL-005 | Remind to write upnote after git commit |
| `cross_repo_ping.py` | PostToolUse(Bash) | CTRL-005 | Auto-ping on cross-repo writes |
| `ping_check.py` | Stop | CTRL-005 | BLOCK finish if unread pings |
| `auto_commit.py` | Stop | GLOBAL-028 | Auto-commit staged changes on session end |
| `auto_ping.py` | PostToolUse(Edit\|Write\|Bash) | CTRL-005 | Auto-touch .ping on upnote writes |
| `compact_reinject.py` | SessionStart(compact) | GLOBAL-006 | Re-inject context after compaction |
| `config_audit.py` | ConfigChange | GLOBAL-009 | Log all settings changes |
| `hook_chain_guard.py` | PreToolUse(Bash) | GLOBAL-028 | Prevent hook chain corruption |
| `single_instance.py` | SessionStart | CTRL-008 | Block duplicate remote sessions |

## Tools (`tools/` → `{repo}/tools/`)

| File | Purpose |
|------|---------|
| `session_guard_lite.py` | SessionStart gate — BLOCK if CLAUDE.md missing or pings unread (GLOBAL-006, CTRL-005) |

## Skills (`skills/` → `.claude/commands/`)

| File | Trigger | What it does |
|------|---------|-------------|
| `done.md` | `/done` | Completion gate (MANDATORY before declaring done) |
| `hygiene.md` | `/hygiene` | Stale artifact scan (GLOBAL-028) |
| `repo-check.md` | `/repo-check` | Full CTRL-001→004 + hygiene |
| `baseline.md` | `/baseline` | Deploy hooks to all repos (CTRL-004) |
| `harvest.md` | `/harvest` | CTRL-001 inspection |
| `check-pings.md` | `/check-pings` | Scan pings across repos (CTRL-005) |
| `sync-hooks.md` | `/sync-hooks` | Detect outdated hooks, push updates |
| `cleanup.md` | `/cleanup` | Auto-clean stale files/folders (GLOBAL-028) |
| `scaffold.md` | `/scaffold` | Enforce uniform folder structure |
| `remote-status.md` | `/remote-status` | Check remote controller + nudge processes |

## Triple-check architecture

```
Layer 1: CLAUDE.md (text rules — can drift if agent ignores)
    ↕ cross-checks ↕
Layer 2: Hooks (programmatic — fires on every tool call / stop)
    ↕ cross-checks ↕
Layer 3: Skills (on-demand — /done, /hygiene, /repo-check)
```

## Updating

1. Edit files in `hooks/`, `skills/`, or `tools/` in this repo
2. Bump `VERSION` (increment number, update date and counts)
3. Run `/sync-hooks` — deploys to all active repos, commits, pushes
