# /baseline -- Deploy hooks + settings to all repos (CTRL-004)

Deploy the portable hooks baseline from `reference/best-practices/hooks-baseline/` to all active repos.

## Steps

1. Read `config/local_repos.json` for all active repo paths
2. For each repo:
   a. Ensure `.claude/hooks/` dir exists — create if not
   b. Ensure `tools/` dir exists — create if not
   c. Copy `block_find_exe.py` -> `{repo}/.claude/hooks/`
   d. Copy `secret_scanner.py` -> `{repo}/.claude/hooks/`
   e. Copy `session_guard_lite.py` -> `{repo}/tools/`
   f. Merge `settings.json.template` into `{repo}/.claude/settings.json`
      - If settings.json exists: ADD hooks entries, preserve existing
      - If not: copy template as-is
   g. Report what was deployed
3. Do NOT commit in other repos — dispatch note telling agent to commit
4. Touch `.ping` in each repo's controller-note/
5. Report summary table
