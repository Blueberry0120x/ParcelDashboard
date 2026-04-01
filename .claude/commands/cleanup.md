# /cleanup -- Auto-clean stale files and folders across all repos

Scans all repos and removes stale artifacts. For NP_ClaudeAgent (writable), cleans directly.
For other repos (read-only), dispatches cleanup notes + pings.

## What gets cleaned

### Always delete (all repos):
- `__pycache__/` dirs (outside .venv/.git)
- `.pytest_cache/` dirs
- `*.pyc` files outside .venv
- `*.bak`, `*.old`, `*.orig`, `*.tmp`, `*~`, `*.copy`, `*.rej` in active paths
- Dead `.pid` files (check if process alive first)
- Stale `.log` files in tools/ (older than 7 days)
- Empty directories (outside .git/.venv/node_modules)

### Never delete:
- Anything in `.git/`, `.venv/`, `node_modules/`
- Anything in `report/archive/`, `config/archive/`
- Files tracked by git (use `git rm --cached` for tracked stale files)
- `controller-note/` files (operational)
- `reference/` files (managed by CTRL-004)

## Steps

1. For NP_ClaudeAgent: clean directly using pathlib
2. For each other repo: scan using pathlib (NEVER use shell commands that trigger Defender)
3. If stale found in read-only repo: write specific file list to controller-note/ + touch .ping
4. Report summary: repo, items found, items cleaned/dispatched

## Rules
- Use `pathlib.Path.rglob()` for scanning
- Use `shutil.rmtree()` for dir removal
- Use `Path.unlink()` for file removal
- NEVER use shell find/rm commands (hook will block them anyway)
