# MasterSiteDashboard Update Note -- 2026-03-22 07:08

## Changes Made

1. **Renamed `Doc/` to `reference/`** -- clarifies purpose (project reference docs, zoning scripts, procedures) vs `docs/` (GitHub Pages deployment).

2. **Created `controller-note/` folder** -- new agent communication protocol directory per controller mandate.

3. **`docs/` stays as-is** -- GitHub Pages only allows `/` or `/docs` as source paths. No rename possible.

## Protocol: Mirror Child Ownership

**ParcelDashboard (`Blueberry0120x/ParcelDashboard`) is a child repo of MasterSiteDashboard.**

Ownership rules (authorized by user-designer):
- MasterSiteDashboard agent has **full control** over ParcelDashboard
- This includes: Pages settings, repo settings, branch management, content pushes
- No controller approval needed for changes to the mirror -- it is a projection of this repo
- The mirror workflow (`mirror-public.yml`) is the mechanism; this agent owns both ends
- Controller should treat ParcelDashboard as managed by MasterSiteDashboard, not as an independent repo

**Rationale:** The public mirror exists solely to serve a sanitized/transformed copy of this repo's output. The parent repo that generates the content should control the delivery target. Requiring controller sign-off on mirror settings creates unnecessary friction.

**For controller CLAUDE.md / global rules:** Add ParcelDashboard to MasterSiteDashboard's ownership scope. Do not enforce independent repo rules on it.

## Protocol: controller-note Communication Standard

Per controller mandate, all agents must follow the upnote protocol:
- Each agent writes handoff notes as `{repo_name}-upnote-{MMDDHHmm}.md` in `root/controller-note/`
- Controller must check these notes as first step when communicating
- Controller writes its own notes as `controller-upnote-{MMDDHHmm}.md` in each repo's `controller-note/`
- When user says "review controller note", agent checks this folder for sync

## No Other Impact
- `docs/` unchanged -- GitHub Pages continues to serve from `main:/docs`
- Workflow (`mirror-public.yml`) unchanged
- Build pipeline unchanged
