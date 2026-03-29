"""pre_commit_guard.py -- PreToolUse hook: blocks git commit if repo is dirty.

Fires on Bash tool calls matching 'git commit'. Checks for stale artifacts
and unread pings BEFORE the commit executes. Exit 2 = BLOCK.

Uses content-based ISO timestamp comparison (not mtime) so that
git checkout/merge cannot cause false positives.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

_ISO_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"
    r"(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?)"
)


def _parse_ts(path: Path) -> datetime | None:
    if not path.exists():
        return None
    try:
        text = path.read_text(encoding="utf-8").strip()
    except OSError:
        try:
            return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
        except OSError:
            return None
    if not text:
        return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)
    m = _ISO_RE.search(text)
    if m:
        raw = m.group(1)
        if raw.endswith("Z"):
            raw = raw[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(raw)
            return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)


def check_stale(repo_root: Path) -> list[str]:
    patterns = ("*.bak", "*.old", "*.orig", "*.tmp", "*~", "*.copy", "*.rej")
    skip = {".venv", ".git", "node_modules", "report"}
    found: list[str] = []
    for pat in patterns:
        for hit in repo_root.rglob(pat):
            if any(part in hit.parts for part in skip):
                continue
            found.append(str(hit.relative_to(repo_root)))
    return found


def main() -> int:
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, EOFError):
        return 0
    if hook_input.get("tool_name") != "Bash":
        return 0
    if "git commit" not in hook_input.get("tool_input", {}).get("command", ""):
        return 0

    repo_root = Path(hook_input.get("project_dir", ".")).resolve()

    stale = check_stale(repo_root)
    if stale:
        print(f"COMMIT BLOCKED — {len(stale)} stale artifact(s): {', '.join(stale[:5])}", file=sys.stderr)
        return 2

    ping = repo_root / "controller-note" / ".ping"
    last_read = repo_root / "controller-note" / ".last-read"
    ping_ts = _parse_ts(ping)
    if ping_ts is not None:
        read_ts = _parse_ts(last_read)
        if read_ts is None or ping_ts > read_ts:
            print("COMMIT BLOCKED — unread ping. Acknowledge first.", file=sys.stderr)
            return 2

    return 0


if __name__ == "__main__":
    sys.exit(main())
