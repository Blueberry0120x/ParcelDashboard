"""single_instance.py -- PreToolUse hook: enforces single remote-invoke session.

Fires only on commands that try to START a remote-invoke or remote-control session.
Blocks if a named PID file already exists and that process is alive.

Uses PID file (tools/remote_invoke_*.pid) rather than counting all claude.exe
processes — avoids false-positives when remote sessions spawn sub-sessions.

Exit 2 = BLOCK (duplicate). Exit 0 = allow.
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path


def _session_already_running(repo_root: Path, name: str) -> tuple[bool, int | None]:
    """Check if a named remote-invoke session is alive via PID file."""
    safe_name = re.sub(r"[^\w.-]", "_", name)
    pid_file = repo_root / "tools" / f"remote_invoke_{safe_name}.pid"
    if not pid_file.exists():
        return False, None
    try:
        pid = int(pid_file.read_text().strip())
        # Check if process is alive (os.kill with signal 0 = existence check)
        os.kill(pid, 0)
        return True, pid
    except (ValueError, OSError):
        return False, None


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return 0

    if hook_input.get("tool_name") != "Bash":
        return 0

    command = hook_input.get("tool_input", {}).get("command", "")

    # Allow informational and control flags through
    passthrough = ("--help", "--version", "--status", "--list",
                   "--stop", "--reinvoke", "--no-nudge")
    if any(f in command for f in passthrough):
        return 0

    # Only intercept actual launch commands
    is_remote_start = (
        "remote-invoke" in command and "--start" in command
    ) or (
        re.search(r'\bremote-control\b', command)
        and re.search(r'\bclaude(\.exe)?\b', command.lower())
        and not re.search(r'(git/refs|api\s|--help)', command)
    )

    if not is_remote_start:
        return 0

    # Extract --name value if present
    name_match = re.search(r'--name\s+(\S+)', command)
    name = name_match.group(1) if name_match else "NP_ClaudeAgent_Controller"

    # Find repo root (CLAUDE.md marker)
    repo_root = Path(__file__).parent.parent.parent
    running, pid = _session_already_running(repo_root, name)

    if running:
        print(
            f"BLOCKED (single-instance): session '{name}' already running (PID {pid}). "
            "Use --reinvoke to restart or --stop to kill first.",
            file=sys.stderr,
        )
        return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
