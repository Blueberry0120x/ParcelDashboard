# RemoteLaunch-HTML

## Overview

Remote Launch HTML is a demo workflow that serves the MasterSiteDashboard
application from a public GitHub Pages site. The private repo
(`MasterSiteDashboard`) auto-mirrors sanitized content to a public repo
(`ParcelDashboard`), which serves HTML via GitHub Pages — accessible from
any desktop browser or phone.

## Architecture

```
MasterSiteDashboard (private)
  │
  │  push to main
  │
  ▼
GitHub Actions: mirror-public.yml
  │
  │  1. Checkout full repo
  │  2. Strip sensitive files (.claude/, .github/, .vscode/, exports/)
  │  3. Replace site-data.json with sanitized demo data
  │  4. Scrub PII from ALL text files (address, APN, inspector names/phones)
  │  5. Remove legacy files with real addresses in filename
  │  6. Force-push sanitized snapshot to ParcelDashboard
  │
  ▼
ParcelDashboard (public)
  │
  │  GitHub Pages (legacy mode, main:/docs)
  │
  ▼
https://blueberry0120x.github.io/ParcelDashboard/
```

## Trigger

**AUTOMATIC.** Every push to `MasterSiteDashboard:main` triggers the mirror
workflow. No manual action needed. The workflow also supports `workflow_dispatch`
for manual runs from the GitHub Actions tab.

## Live URLs

| Page | URL |
|------|-----|
| Launcher | https://blueberry0120x.github.io/ParcelDashboard/ |
| Desktop Map | https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html |
| Mobile Map | https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap_Mobile.html |
| Desktop Checklist | https://blueberry0120x.github.io/ParcelDashboard/PreApp_Checklist.html |
| Mobile Checklist | https://blueberry0120x.github.io/ParcelDashboard/PreApp_Checklist_Mobile.html |

## Sensitive Data Handling

The mirror workflow strips all PII before pushing to public:

| Data | Private repo | Public repo |
|------|-------------|-------------|
| Address | 4335 Euclid Avenue | 123 Demo Street |
| APN | 471-271-16-00 | 000-000-00-00 |
| Zoning | CUPD-CU-2-4 | DEMO-ZONE |
| Inspectors | 5 real names + phones | Empty array |
| .claude/ | Present | Stripped |
| .github/ | Present (workflows) | Stripped |
| .vscode/ | Present | Stripped |
| exports/ | Present | Stripped |

## Secrets Required

| Secret | Repo | Purpose |
|--------|------|---------|
| `PUBLIC_MIRROR_PAT` | MasterSiteDashboard | PAT with `repo` scope to push to ParcelDashboard |

## Verification

Run the 20-test verification suite (see NP_ClaudeAgent report for full procedure):
- Tests 1-7: File structure and sensitive dir/file stripping
- Tests 8-9: Source code and Output HTML presence
- Tests 10-14: SHA comparison (code fidelity)
- Tests 15-18: HTML accessibility (desktop + mobile + launcher links)
- Test 19: GitHub Pages active
- Test 20: Deep PII scan across ALL text files (zero leaks)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Workflow fails with 403 | `PUBLIC_MIRROR_PAT` expired or missing `repo` scope. Regenerate and update secret. |
| Workflow fails with "workflow scope" | The mirror is pushing `.github/` files. Ensure `rm -rf .github/` is in the strip phase. |
| Pages shows 404 | Check Pages settings: must be `legacy` mode, `main` branch, `/docs` path. Run `gh api repos/.../pages/builds -X POST` to trigger rebuild. |
| PII leak detected | Add new PII patterns to the `sed` commands in `mirror-public.yml`. |

## History

- 2026-03-22: Initial setup — workflow created, 20-test verification passed, GitHub Pages live
