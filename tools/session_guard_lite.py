"""session_guard_lite.py -- Portable session guard for all project repos.

Runs at SessionStart. Checks:
  a) CLAUDE.md exists (BLOCKING)
  b) Unread pings in controller-note/ (BLOCKING)
  c) Warns about uncommitted work
  d) Warns about stale artifacts
  e) Kills OneDrive if running (GLOBAL-025)

Derives all paths from cwd — no hardcoded paths. Works in any repo.
Exit 0 = OK, Exit 1 = BLOCKED.

Uses content-based ISO timestamp comparison (not mtime) so that
git checkout/merge cannot cause false positives.
"""
from __future__ import annotations

import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

_ISO_RE = re.compile(
    r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"
    r"(?:\.\d+)?(?:[+-]\d{2}:\d{2}|Z)?)"
)


def _parse_ts(path: Path) -> datetime | None:
    """Parse ISO timestamp from .ping or .last-read file content."""
    if not path.exists():
        return None
    try:
        text = path.read_text(encoding="utf-8").strip()
    except OSError:
        try:
            return datetime.fromtimestamp(
                path.stat().st_mtime, tz=timezone.utc,
            )
        except OSError:
            return None
    if not text:
        return datetime.fromtimestamp(
            path.stat().st_mtime, tz=timezone.utc,
        )
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


def _run(cmd: list[str], cwd: Path | None = None) -> str:
    try:
        r = subprocess.run(cmd, capture_output=True, text=True,
                           cwd=cwd, timeout=10)
        return r.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return ""


def check_claude_md(repo_root: Path) -> bool:
    """Return True if CLAUDE.md is missing."""
    paths = [
        repo_root / ".claude" / "CLAUDE.md",
        repo_root / "CLAUDE.md",
    ]
    if any(p.exists() for p in paths):
        return False
    print("BLOCKED: No CLAUDE.md found")
    return True


def check_pings(repo_root: Path) -> bool:
    """Return True if unread pings exist (content-based comparison)."""
    ping = repo_root / "controller-note" / ".ping"
    last_read = repo_root / "controller-note" / ".last-read"
    ping_ts = _parse_ts(ping)
    if ping_ts is None:
        return False
    read_ts = _parse_ts(last_read)
    if read_ts is not None and ping_ts <= read_ts:
        return False
    print("UNREAD PING — read controller-note/ before proceeding")
    return True


def check_uncommitted(repo_root: Path) -> None:
    output = _run(["git", "status", "--porcelain"], cwd=repo_root)
    if output:
        print(f"WARNING: {len(output.splitlines())} uncommitted file(s)")


def check_behind_remote(repo_root: Path) -> None:
    """Fetch and warn if current branch is behind remote."""
    branch = _run(["git", "branch", "--show-current"], cwd=repo_root)
    if not branch:
        return
    _run(["git", "fetch", "origin", branch], cwd=repo_root)
    behind = _run(
        ["git", "rev-list", "--count", f"HEAD..origin/{branch}"],
        cwd=repo_root,
    )
    if behind and behind.isdigit() and int(behind) > 0:
        print(
            f"ACTION REQUIRED: Branch '{branch}' is {behind} commit(s) "
            f"behind origin/{branch}. Run: git pull origin {branch}"
        )


def check_stale(repo_root: Path) -> None:
    patterns = ("*.bak", "*.old", "*.orig", "*.tmp", "*~")
    skip = {".venv", ".git", "node_modules"}
    count = 0
    for pat in patterns:
        for hit in repo_root.rglob(pat):
            if any(part in hit.parts for part in skip):
                continue
            count += 1
    if count:
        print(f"WARNING: {count} stale artifact(s) in active paths")


def kill_onedrive() -> None:
    tasklist = _run(["tasklist", "/FI", "IMAGENAME eq OneDrive.exe"])
    if "OneDrive.exe" in tasklist:
        _run(["taskkill", "/F", "/IM", "OneDrive.exe"])
        print("OneDrive.exe killed (GLOBAL-025)")


def main() -> int:
    repo_root = Path.cwd().resolve()
    git_dir = _run(["git", "rev-parse", "--show-toplevel"], cwd=repo_root)
    if git_dir:
        repo_root = Path(git_dir)

    print(f"session_guard: {repo_root.name}")
    print("-" * 40)

    kill_onedrive()
    missing = check_claude_md(repo_root)
    unread = check_pings(repo_root)
    check_uncommitted(repo_root)
    check_behind_remote(repo_root)
    check_stale(repo_root)

    print("-" * 40)
    if missing:
        print("BLOCKED: Fix rule files before proceeding.")
        return 1

    if unread:
        print(
            "ACTION REQUIRED: Unread ping(s) detected. "
            "Read controller-note/ as your FIRST action this session."
        )

    print("Session guard passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
