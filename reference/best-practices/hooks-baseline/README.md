# Hooks Baseline — Deployment Guide

Portable enforcement hooks for all repos in the ecosystem.
Pushed via CTRL-004 Baseline Push. Source: `NP_ClaudeAgent/reference/best-practices/hooks-baseline/`.

## What's included

| File | Hook Event | Rule Enforced | Behavior |
|------|-----------|---------------|----------|
| `session_guard_lite.py` | SessionStart | GLOBAL-006, CTRL-005 | BLOCK if CLAUDE.md missing or pings unread |
| `block_find_exe.py` | PreToolUse (Bash) | GLOBAL-027 | BLOCK find.exe, secret-hunting, curl\|bash |
| `strictmode_check.py` | PreToolUse (Bash) | GLOBAL-010 | BLOCK commit if PS files lack StrictMode |
| `com_lifecycle_check.py` | PreToolUse (Bash) | GLOBAL-013 | BLOCK commit if COM objects lack try/finally |
| `branch_naming.py` | PreToolUse (Bash) | GLOBAL-003 | BLOCK invalid branch names |
| `backup_config.py` | PreToolUse (Edit/Write) | GLOBAL-014 | Auto-backup config files before edit |
| `secret_scanner.py` | PostToolUse (Bash) | GLOBAL-027 | WARN if tokens detected in output |
| `upnote_reminder.py` | PostToolUse (Bash) | CTRL-005 | Remind to write upnote after git commit |
| `ping_check.py` | Stop | CTRL-005 | BLOCK finish if unread pings across repos |
| `settings.json.template` | — | — | Template for .claude/settings.json |

## Deployment (per repo)

1. Copy hooks to repo:
   ```
   cp block_find_exe.py strictmode_check.py com_lifecycle_check.py \
      branch_naming.py backup_config.py secret_scanner.py \
      upnote_reminder.py ping_check.py  {repo}/.claude/hooks/
   cp session_guard_lite.py  {repo}/tools/
   ```

2. Merge `settings.json.template` into `{repo}/.claude/settings.json`

3. Commit: `"Add baseline enforcement hooks (CTRL-004)"`

## Triple-check architecture

```
Layer 1: CLAUDE.md (text rules — can drift if agent ignores)
    ↕ cross-checks ↕
Layer 2: Hooks (programmatic — fires on every tool call / stop)
    ↕ cross-checks ↕
Layer 3: Skills (on-demand — /done, /hygiene, /repo-check)
```

| CLAUDE.md rule | Hook enforcement | What it catches |
|---------------|-----------------|-----------------|
| "never use find.exe" | block_find_exe.py BLOCKS | Agent ignoring text rule |
| "check pings at session start" | session_guard_lite.py BLOCKS | Agent skipping protocol |
| "never expose secrets" | secret_scanner.py WARNS | Token leaks in output |
| "StrictMode in all PS files" | strictmode_check.py BLOCKS commit | Missing StrictMode |
| "COM objects need try/finally" | com_lifecycle_check.py BLOCKS commit | Ghost COM processes |
| "backup before config change" | backup_config.py auto-backs up | Config overwrites |
| "valid branch names only" | branch_naming.py BLOCKS | Bad naming conventions |
| "write upnote after changes" | upnote_reminder.py REMINDS | Silent cross-repo changes |
| "acknowledge all pings" | ping_check.py BLOCKS finish | Unread communications |

## Updating

Source of truth: `NP_ClaudeAgent/reference/best-practices/hooks-baseline/`
CTRL-004 syncs this to all repos. To update: edit source, push, run repo-sync.
