# /sync-hooks -- Deploy updated hooks baseline to all repos

Detects outdated hooks in repos and pushes the latest baseline.

## Steps

1. Read `config/hook_registry.json` for the rule-to-hook mapping
2. Read `reference/best-practices/hooks-baseline/VERSION` for canonical version
3. For each active repo in `config/local_repos.json`:
   a. Check `{repo}/reference/best-practices/hooks-baseline/VERSION`
   b. If missing or outdated:
      - Create `.claude/hooks/` dir if needed
      - Copy ALL portable hooks from baseline to `{repo}/.claude/hooks/`
      - Copy `session_guard_lite.py` to `{repo}/tools/`
      - Copy `VERSION` to `{repo}/reference/best-practices/hooks-baseline/`
      - Merge `settings.json.template` into `{repo}/.claude/settings.json`
        (ADD new hooks, preserve existing entries, never overwrite)
      - Write dispatch note: "[HOOKS-UPDATE] Baseline v{N} deployed"
      - Touch `.ping`
   c. If current: skip, report "up to date"
4. Report summary table: repo, old version, new version, status

## Rules
- Use Python `shutil.copy2` for file copies
- Use `pathlib` for all paths
- NEVER overwrite project-specific hooks (only baseline hooks)
- NEVER delete existing hooks not in baseline
