"""Standalone pre-session guard for any repo.

Self-contained -- no imports from NP_ClaudeAgent. Copy to any repo's
tools/ folder and wire into .claude/settings.json as a SessionStart hook.

Checks enforced:
  a) Unread pings in controller-note/ (BLOCKING -- exit 1)
  b) Uncommitted work warning
  c) Unpushed commits warning
  d) Branch != main warning
  e) Kill OneDrive.exe (GLOBAL-025)

Exit 0 = OK, Exit 1 = unread ping (blocking).
"""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def _run(cmd: list[str], cwd: Path | None = None) -> str:
    """Run a command, return stdout. Empty string on failure."""
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=cwd,
            timeout=10,
        )
        return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
        return ""


def check_pings(repo_root: Path) -> bool:
    """Check controller-note/ pings. Return True if unread."""
    note_dir = repo_root / "controller-note"
    ping_file = note_dir / ".ping"
    last_read = note_dir / ".last-read"

    if not ping_file.exists():
        return False

    ping_mtime = ping_file.stat().st_mtime
    if last_read.exists() and ping_mtime <= last_read.stat().st_mtime:
        return False

    print("UNREAD PING -- read controller-note/ before proceeding")
    return True


def check_uncommitted(repo_root: Path) -> None:
    """Warn about dirty working tree."""
    output = _run(["git", "status", "--porcelain"], cwd=repo_root)
    if output:
        count = len(output.splitlines())
        print(f"WARNING: {count} uncommitted file(s) in working tree")


def check_unpushed(repo_root: Path) -> None:
    """Warn about commits not pushed to remote."""
    output = _run(
        ["git", "log", "--oneline", "@{u}..HEAD"],
        cwd=repo_root,
    )
    if output:
        count = len(output.splitlines())
        print(f"WARNING: {count} unpushed commit(s)")


def check_branch(repo_root: Path) -> None:
    """Warn if current branch is not main."""
    branch = _run(
        ["git", "branch", "--show-current"],
        cwd=repo_root,
    )
    if branch and branch != "main":
        print(f"WARNING: On branch '{branch}', not main")


def kill_onedrive() -> None:
    """Kill OneDrive.exe if running (GLOBAL-025)."""
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
    has_unread = check_pings(repo_root)
    check_uncommitted(repo_root)
    check_unpushed(repo_root)
    check_branch(repo_root)

    print("-" * 40)
    if has_unread:
        print("BLOCKED: Acknowledge pings before proceeding.")
        return 1

    print("Session guard passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
