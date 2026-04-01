---
name: public-sync
description: Push built HTML to public GitHub Pages repo (ParcelDashboard) or pull saved state back from public. Use for publishing or syncing state between private dev and public demo.
---

Sync between private ProjectBook-Planner and public ParcelDashboard (GitHub Pages).

## Arguments

- `$ARGUMENTS` — "push" to publish, "pull" to import state from public, or "status" to check

## Repos

- **Private:** `Blueberry0120x/ProjectBook-Planner` (source, build pipeline, all data)
- **Public:** `Blueberry0120x/ParcelDashboard` (GitHub Pages, docs/ folder, standalone HTML only)
- **Pages URL:** `https://blueberry0120x.github.io/ParcelDashboard/`
- **Pages source:** `main` branch, `/docs` path

## Push (Private → Public)

Publishes the latest build to the public demo site.

### Procedure

1. Build locally: `py tools/build.py` (ensures Output/ is current)
2. Copy Output HTML to local docs/:
   ```
   cp Output/InteractiveMap.html docs/InteractiveMap.html
   cp Output/PreApp_Checklist.html docs/PreApp_Checklist.html
   cp Output/architecture.html docs/architecture.html
   ```
3. Clone ParcelDashboard to temp dir
4. Copy docs/ files into the clone's docs/ folder
5. Ensure docs/index.html exists (redirect to InteractiveMap.html)
6. Commit and push to ParcelDashboard main
7. Wait ~30s for GitHub Pages deploy
8. Verify with: `curl -sk -o /dev/null -w "%{http_code}" https://blueberry0120x.github.io/ParcelDashboard/`

### What gets published
- `docs/index.html` — redirect to InteractiveMap
- `docs/InteractiveMap.html` — full map with all 7 sites baked in
- `docs/PreApp_Checklist.html` — full checklist with site sync
- `docs/architecture.html` — system diagram
- `README.md` — with live links

### What does NOT get published
- Source code (src/), build tools (tools/), config, controller-note
- No server needed — all JS/CSS/data inlined in HTML

## Pull (Public → Private)

Imports saved state from the public version back into the private site JSON files. Useful when the designer adjusts building positions on the public demo.

### Procedure

1. Fetch the public HTML:
   ```
   curl -sk https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html > /tmp/public_map.html
   ```
2. Extract `__SITE_DEFAULTS__` from the HTML:
   ```python
   import re, json
   html = open('/tmp/public_map.html').read()
   match = re.search(r'window\.__SITE_DEFAULTS__\s*=\s*({.*?});', html, re.DOTALL)
   sd = json.loads(match.group(1))
   ```
3. For the active site, extract `.saved` and write to local site JSON:
   ```python
   site_file = 'data/sites/ca-{id}.json'
   with open(site_file) as f: d = json.load(f)
   d['saved'] = sd['saved']  # overwrite session state from public
   with open(site_file, 'w') as f: json.dump(d, f, indent=2)
   ```
4. Rebuild: `py tools/build.py`

### What gets pulled
- Building positions, sizes, orientations, stacking
- Setback values, rotation, lat/lng
- Dim state: hidden keys, merged keys, chain offsets, prop dim offsets
- Vehicle positions
- Map opacity, toggle states

### What does NOT get pulled
- .site data (zoning, FAR, fees) — this is manual-edit only
- Source code changes — public has no source

## Status Check

```bash
# Compare baked siteId in public vs private
curl -sk https://blueberry0120x.github.io/ParcelDashboard/InteractiveMap.html | grep -o '"siteId":"[^"]*"' | head -1
grep -o '"activeSiteId":"[^"]*"' data/site-data.json
```

## Rules

- Always build before pushing — never push stale Output
- Public version has real data (addresses, APNs, inspectors) — accepted risk per controller
- The public HTML has `__ALL_SITE_DATA__` baked in — all 7 sites switchable offline
- Public has no server — save goes to localStorage only (no POST /save)
- Pull overwrites .saved ONLY — never touches .site
- Always commit private repo before and after pull to preserve history
