# MasterSiteDashboard Update Note -- 2026-03-22 07:14

## Status: Mobile/Desktop Auto-Detection

**Current state:**
- Mobile auto-redirect exists ONLY in the mirror workflow (`mirror-public.yml`)
- It is injected into ParcelDashboard (public) copies at deploy time
- Source files (`src/`, `Output/`) have NO auto-detection -- desktop and mobile are separate files with no switching
- Dev server (`localhost:7734`) serves desktop only

**Separate files currently maintained:**
- `InteractiveMap.html` + `InteractiveMap_Mobile.html`
- `PreApp_Checklist.html` + `PreApp_Checklist_Mobile.html`

## Requested: True Responsive Merge

User-designer wants desktop and mobile merged into single responsive files:
- Use `@media` queries / CSS breakpoints instead of separate `_Mobile` files
- No redirect flash, no separate file maintenance
- One codebase serves both desktop and mobile seamlessly
- This should replace the current JS userAgent redirect approach

**Impact:**
- Eliminates 2 mobile HTML files (InteractiveMap_Mobile, PreApp_Checklist_Mobile)
- Mirror workflow can drop the mobile redirect injection step
- Build pipeline simplifies (2 output files instead of 4)
- `docs/` folder reduces from 5 files to 3 (index + 2 responsive pages)

## For Controller / Orchestrator

This is a significant UI refactor. Controller should coordinate timing with any other suite-wide changes. The responsive merge affects:
- Build script (`Engine_InteractiveParcelMap.ps1`)
- Mirror workflow (`mirror-public.yml`)
- GitHub Pages structure (`docs/`)
- Any cross-repo links pointing to `_Mobile` variants
