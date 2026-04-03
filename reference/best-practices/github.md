# GitHub Best Practices

**Applies to:** All repos under Blueberry0120x
**Source:** GLOBAL-003 + project conventions
**Synced by:** CTRL-004 Baseline Push

---

## Branch Naming

| Pattern | Use |
|---------|-----|
| `main` | Default branch — production-ready code |
| `feature/{topic}` | New feature development |
| `fix/{topic}` | Bug fixes |
| `claude/{topic}-dev{N}` | Claude agent development branches |
| `archived/{name}` | Preserved branches before cleanup/deletion |

**Rules:**
- `main` is the only long-lived branch
- Never keep both `main` and `master` — rename `master` to `main`
- Delete feature/fix branches after merge
- Stale branches (>30 days no commit): archive or delete

## Commits

- Commit messages: start with verb, describe what and why
- Prefix dispatch commits: `[DISPATCH-DONE] ...`
- Baseline push commits: `Add baseline standards (Controller CTRL-004 push)`
- Never commit secrets (`.env`, tokens, credentials)

## Pull Requests

- Title: under 70 characters, action-oriented
- Body: summary bullets + test plan
- One PR per logical change (not one per file)

## GitHub Actions

- Workflows live in `.github/workflows/`
- Use `repository_dispatch` for cross-repo communication (CTRL-005 ping)
- Pin action versions to SHA, not tags
- Use secrets for tokens — never hardcode

## .gitignore

- Always ignore: `__pycache__/`, `.env`, `*.pyc`, `.DS_Store`, `Thumbs.db`
- Ignore runtime output: `report/*.generated.*`, `output/*.tmp`
- Never ignore: `reference/`, `controller-note/`, config files

## Repository Structure

Every repo should have:
```
{repo}/
  .claude/CLAUDE.md      # Agent instructions (or root CLAUDE.md)
  .gitignore             # Runtime/sensitive data exclusions
  reference/             # Project docs + best-practices/ (synced)
  controller-note/       # CTRL-005 communication protocol
  report/                # Output reports (GLOBAL-005)
```
