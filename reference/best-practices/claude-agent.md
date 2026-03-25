# Claude Agent Best Practices

**Applies to:** All repos with `.claude/CLAUDE.md`
**Source:** Designer directives + GLOBAL rules
**Synced by:** CTRL-004 Baseline Push

---

## CLAUDE.md Structure

Every project CLAUDE.md must have these sections (CTRL-004 baseline):

| Section | Rule | Required |
|---------|------|----------|
| Project Goal | GLOBAL-001 | Yes — 1-3 sentences at top |
| File Encoding | GLOBAL-002 | Yes — UTF-8, no BOM |
| Branch Naming | GLOBAL-003 | Yes — link to global rules |
| Completion Protocol | GLOBAL-006 | Yes — run tests, verify, then done |
| Handoff Notes | GLOBAL-007 | Yes — dated session summaries |
| Safety Contract | GLOBAL-008 | Yes — read-only vs writable boundaries |

**Location:** `.claude/CLAUDE.md` (preferred) or root `CLAUDE.md`. Always check
`.claude/` first.

## Controller-Note Protocol (CTRL-005)

**Every agent must follow this — it is a dev standard, not optional.**

### Rolling file format
- One file per repo: `{repo_name}-upnote.md` in `controller-note/`
- Entry format: `## [YYYY-MM-DD HH:MM] Subject -- TYPE`
- Newest entries at top
- Resolved items: ~~strikethrough~~

### Auto-ping
- `.ping` file touched on every write (contains: who, when, subject)
- `.last-read` file updated after reading
- Check `.ping` mtime vs `.last-read` at session start — AUTOMATIC
- GitHub Actions `repository_dispatch` for remote ping (if workflow exists)

### When to write
- **Every change:** Agent appends entry + touches `.ping`
- **Controller writes to your repo:** Only for global updates or Designer-authorized overrides
- **No silent changes:** Any cross-scope change needs an upnote

### When to read
- **Session start:** Auto-check `.ping` — if newer than `.last-read`, read notes
- **Never wait for user to say "check notes"** — just do it

## Completion Protocol

Before declaring any task complete:
1. Run tests — all must pass
2. Run self-check against own repo — must not crash
3. Run compliance analysis — must score 100%
4. If any step fails, fix first. Never commit broken code.

## Handoff Notes

At end of every session, write what was done:
- What was completed
- What still needs work
- Known issues
- Use absolute dates (not "yesterday" or "last week")

## Verification Standards

- **Never guess data** — use API/CLI/filesystem first
- **Never skip self-check** — run every new tool against own repo
- **Bug found once, check everywhere** — grep for same pattern in all modules
- **Read before modify** — ALWAYS read project docs before changing anything

## Authority Model

```
Designer (Owner) — final authority
  └── Controller (NP_ClaudeAgent) — scans, reports, enforces
        └── Project Agents — follow global rules + local CLAUDE.md
```

- Global rule wins over project rule (unless explicit override with justification)
- Controller only overrides with Designer permission
- Conflicts flagged for Designer review — never resolved unilaterally

## Anti-Patterns

- Don't add features beyond what was asked
- Don't over-engineer error handling for impossible scenarios
- Don't create abstractions for one-time operations
- Don't add docstrings/comments to code you didn't change
- Don't commit without running the completion protocol
- Don't delete/move files without reading all project docs first
