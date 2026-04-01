# /remote-status -- Check and clean remote controller + nudge processes

Single source of truth for CTRL-008 process health.

## Steps

1. Run `py -m src.main remote-invoke --status` to list sessions
2. Check `tasklist` for claude.exe and powershell.exe processes
3. Cross-reference PID files in tools/ with live processes
4. Kill any orphan processes (dead PID files, duplicate sessions)
5. If no session running: report "no active session"
6. If session running: report PID, uptime, keep-alive status, F15 status

## Rules
- Only ONE claude.exe remote-control session at a time
- Only ONE keep-alive powershell process at a time
- Only ONE F15 nudge powershell process at a time
- If duplicates found: kill all, reinvoke fresh with `--reinvoke`
- Never dump full CommandLine from process queries (GLOBAL-027)
