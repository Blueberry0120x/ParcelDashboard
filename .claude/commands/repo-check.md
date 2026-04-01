# /repo-check — Full Repo-Sync + Hygiene (CTRL-001→004 + GLOBAL-028)

Run the complete repo health check cycle:

1. `py -m src.main repo-sync --token $GITHUB_TOKEN --verbose` (CTRL-001→004)
2. Scan all repos for stale artifacts (GLOBAL-028) using pathlib — NEVER find.exe
3. For repos below 100%: dispatch cleanup notes + ping
4. For repos with stale artifacts: dispatch hygiene notes + ping
5. Report full summary table

After completing all dispatches, run `/done` to verify NP_ClaudeAgent itself is clean.
