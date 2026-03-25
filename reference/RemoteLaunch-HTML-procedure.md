# RemoteLaunch-HTML-procedure

## Overview

Remote Launch HTML serves the ProjectBook-Planner application from a public
GitHub Pages site. The private repo (`ProjectBook-Planner`) auto-mirrors
**real data** to a public repo (`ParcelDashboard`), which serves HTML via
GitHub Pages — accessible from any desktop browser or phone.

## Architecture

```
ProjectBook-Planner (private)
  |
  |  push to main
  |
  v
GitHub Actions: mirror-public.yml
  |
  |  1. Checkout full repo (fetch-depth: 0, persist-credentials: false)
  |  2. Strip dev files only (.claude/, .github/, .vscode/, .env)
  |  3. Fix cross-links (dev server routes -> static file paths)
  |  4. Force-push real-data snapshot to ParcelDashboard
  |
  v
ParcelDashboard (public)
  |
  |  GitHub Pages (legacy mode, main:/docs)
  |
  v
https://blueberry0120x.github.io/ParcelDashboard/
```

## Trigger

**AUTOMATIC.** Every push to `ProjectBook-Planner:main` triggers the mirror
workflow. No manual action needed. The workflow also supports `workflow_dispatch`
for manual runs from the GitHub Actions tab.

## Live URLs

| Page | URL |
|------|-----|
| Launcher | https://blueberry0120x.github.io/ParcelDashboard/ |
| Map | https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html |
| Checklist | https://blueberry0120x.github.io/ParcelDashboard/PreApp_Checklist.html |

## Data Policy

**Real data — no sanitization.** The public mirror is a faithful exact copy of
the private repo (minus dev files). All site data, addresses, inspector names,
and project details appear as-is.

| Content | Private repo | Public repo |
|---------|-------------|-------------|
| Site data (address, APN, inspectors) | Present | Present (real) |
| .claude/ | Present | Stripped |
| .github/ | Present (workflows) | Stripped |
| .vscode/ | Present | Stripped |
| .env / .env.* | Present | Stripped |

## Mirror Transforms (applied by workflow Python script)

| Transform | What it does |
|-----------|-------------|
| **Cross-link fix** | Map `href="checklist"` -> `href="PreApp_Checklist.html"`, Checklist `href="/"` -> `href="InteractiveMap.html"` |
| **Mobile auto-detect** | Injects JS that checks `navigator.userAgent` + `window.innerWidth<=768`, redirects desktop<->mobile |
| **Dark mode toggle** | Injects sun/moon toggle button (fixed top-right), localStorage persistence, system preference fallback |
| **Dark mode CSS** | CSS variable overrides + attribute selectors for inline styles (`[style*="color:#0f4c81"]` etc.) |
| **Theme-color meta** | Splits into light/dark variants for browser chrome color |

## Dark Mode Details

The dark mode system uses `html[data-theme="dark"]` (not `@media prefers-color-scheme`)
so the toggle button can override system preference.

**Color mapping (light -> dark):**

| Light color | Dark equivalent | Used for |
|------------|----------------|----------|
| `#0f4c81` | `#93c5fd` | Primary blue text |
| `#2d3748`, `#1a202c` | `#e2e8f0` | Body text |
| `#334155`, `#475569`, `#4a5568` | `#94a3b8` / `#cbd5e1` | Secondary text |
| `#64748b` | `#94a3b8` | Muted labels |
| `#fff`, `#f1f5f9`, `#f0f2f5` | `#1e293b` | Card/panel backgrounds |
| `#f4f7fb` | `#0f172a` | Page background |
| `#dbe3ee` | `#334155` | Borders |

**Persistence:** Toggle state saves to `localStorage('theme')`. On page load,
checks localStorage first, then falls back to `window.matchMedia('(prefers-color-scheme:dark)')`.

## Secrets Required

| Secret | Repo | Purpose |
|--------|------|---------|
| `PUBLIC_MIRROR_PAT` | ProjectBook-Planner | OAuth token with `repo` scope to push to ParcelDashboard |

**Note:** Must use `persist-credentials: false` in `actions/checkout@v4` to prevent
the default `GITHUB_TOKEN` credential helper from overriding the custom PAT.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Workflow fails with 403 | `PUBLIC_MIRROR_PAT` expired or missing `repo` scope. Regenerate and update secret. |
| Workflow fails with "workflow scope" | Mirror is pushing `.github/` files. Ensure `rm -rf .github/` is in the strip phase. |
| Pages shows 404 | Check Pages settings: must be `legacy` mode, `main` branch, `/docs` path. Run `gh api repos/.../pages/builds -X POST`. |
| Dark mode text invisible | Add missing color to the attribute selector overrides in the workflow Python script. |
| Cross-links broken | Check if dev server routes changed. Update the `fixes` dict in the Python script. |
| Mobile redirect loop | Check `_Mobile` suffix logic in the auto-detect JS. |

## History

- 2026-03-22: Initial setup — workflow created, GitHub Pages live
- 2026-03-22: Switched from sanitized to real data (Designer directive)
- 2026-03-22: Added cross-link fixes for static hosting
- 2026-03-22: Added mobile auto-detection (desktop<->mobile redirect)
- 2026-03-22: Added dark mode toggle + comprehensive CSS overrides (inline style attribute selectors)
- 2026-03-22: Generalized mobile hint (iOS + Android)
- 2026-03-22: Added GLOBAL-018 rule: must launch/verify HTML after every build
