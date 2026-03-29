#!/usr/bin/env python3
"""
build.py - Canonical build pipeline for ProjectBook-Planner.

Compiles src/ into Output/InteractiveMap.html and Output/PreApp_Checklist.html.
Optionally runs a local dev server with save/switch endpoints.

Usage:
    python tools/build.py            # compile only
    python tools/build.py debug      # compile + open in browser
    python tools/build.py serve      # compile + local server (port 3034)
"""
from __future__ import annotations

import json
import os
import re
import shutil
import sys
import webbrowser
from pathlib import Path

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE = Path(__file__).resolve().parent.parent
SRC = BASE / "src"
OUTPUT_DIR = BASE / "Output"
DOCS_DIR = BASE / "docs"
SITE_DATA_FILE = BASE / "data" / "site-data.json"
SITES_DIR = BASE / "data" / "sites"

OUTPUT_MAP = OUTPUT_DIR / "InteractiveMap.html"
OUTPUT_CHK = OUTPUT_DIR / "PreApp_Checklist.html"

PUBLIC_URL = "https://blueberry0120x.github.io/ParcelDashboard/"

ENGINES = [
    "js/engine-config.js",
    "js/engine-ui.js",
    "js/engine-map.js",
    "js/engine-elevation.js",
    "js/engine-setback.js",
    "js/engine-export.js",
    "js/engine-resize.js",
    "js/bootstrap.js",
]

PORT = 3040


# ── Core helpers ──────────────────────────────────────────────────────────────

def get_active_site_id() -> str | None:
    """Read activeSiteId pointer from site-data.json."""
    if not SITE_DATA_FILE.exists():
        return None
    try:
        sd = _read_json(SITE_DATA_FILE)
        # New pointer format
        aid = sd.get("activeSiteId")
        if aid:
            return str(aid)
        # Migration: top-level siteId (client payload)
        tid = sd.get("siteId")
        if tid:
            return str(tid)
        # Migration: old full-copy format had .site.siteId
        site = sd.get("site")
        if site and site.get("siteId"):
            return str(site["siteId"])
    except Exception as e:
        print(f"  [WARN] site-data.json unreadable: {e}")
    return None


def _read_json(path: Path) -> dict:
    """Read a JSON file, tolerating UTF-8 BOM."""
    return json.loads(path.read_text(encoding="utf-8-sig"))


def get_site_file(site_id: str) -> Path | None:
    """Find the .json path for a given siteId by scanning data/sites/."""
    if not SITES_DIR.is_dir():
        return None
    for f in SITES_DIR.glob("*.json"):
        try:
            raw = _read_json(f)
            site = raw.get("site")
            if site and str(site.get("siteId", "")) == site_id:
                return f
        except Exception:
            continue
    return None


def _merge_site_data(sd: dict) -> dict:
    """Merge a site JSON (project + site + saved) into a flat defaults dict."""
    merged = {}
    if sd.get("project"):
        merged["project"] = sd["project"]
    if sd.get("site"):
        merged.update(sd["site"])
    if sd.get("saved"):
        merged.update(sd["saved"])
    return merged


def get_inject_script() -> str:
    """Build <script>window.__SITE_DEFAULTS__ = {...};</script> from active site file."""
    active_id = get_active_site_id()
    if not active_id:
        return ""
    site_file = get_site_file(active_id)
    if not site_file:
        return ""
    try:
        sd = _read_json(site_file)
        merged = _merge_site_data(sd)
        merged["siteFileName"] = site_file.name
        if merged:
            j = json.dumps(merged, separators=(",", ":"))
            return f"<script>window.__SITE_DEFAULTS__ = {j};</script>"
    except Exception:
        pass
    return ""


def get_site_list_script() -> str:
    """Build <script>window.__SITE_LIST__ = [...];</script> from all site files."""
    if not SITES_DIR.is_dir():
        return ""
    entries = []
    for f in sorted(SITES_DIR.glob("*.json")):
        try:
            raw = _read_json(f)
            site = raw.get("site")
            if not site:
                continue
            entries.append({
                "siteId": site.get("siteId", ""),
                "address": site.get("address", ""),
                "apn": site.get("apn", ""),
                "file": f.name,
            })
        except Exception:
            continue
    if entries:
        j = json.dumps(entries, separators=(",", ":"))
        return f"<script>window.__SITE_LIST__ = {j};</script>"
    return ""


def get_all_site_data_script() -> str:
    """Build <script>window.__ALL_SITE_DATA__ = {...};</script> for offline switching."""
    if not SITES_DIR.is_dir():
        return ""
    all_data = {}
    for f in sorted(SITES_DIR.glob("*.json")):
        try:
            sd = _read_json(f)
            site = sd.get("site")
            if not site or not site.get("siteId"):
                continue
            site_id = str(site["siteId"])
            merged = _merge_site_data(sd)
            merged["siteFileName"] = f.name
            all_data[site_id] = merged
        except Exception:
            continue
    if all_data:
        j = json.dumps(all_data, separators=(",", ":"))
        return f"<script>window.__ALL_SITE_DATA__ = {j};</script>"
    return ""


def get_sites_api_json() -> str:
    """Return JSON array for GET /api/sites."""
    active_id = get_active_site_id()
    sites = []
    if SITES_DIR.is_dir():
        for f in sorted(SITES_DIR.glob("*.json")):
            try:
                raw = _read_json(f)
                site = raw.get("site")
                if not site or not site.get("siteId"):
                    continue
                sites.append({
                    "id": str(site["siteId"]),
                    "address": site.get("address", ""),
                    "apn": site.get("apn", ""),
                    "active": str(site["siteId"]) == active_id,
                })
            except Exception:
                continue
    return json.dumps(sites, separators=(",", ":"))


def set_active_site(site_id: str) -> bool:
    """Write activeSiteId pointer to site-data.json and rebuild."""
    if not site_id:
        return False
    site_file = get_site_file(site_id)
    if not site_file:
        return False
    pointer = json.dumps({"activeSiteId": site_id}, separators=(",", ":"))
    SITE_DATA_FILE.write_text(pointer, encoding="utf-8")
    build_interactive_map()
    build_checklist()
    return True


# ── Build functions ───────────────────────────────────────────────────────────

def _inject_globals(html: str) -> str:
    """Inject __SITE_DEFAULTS__, __SITE_LIST__, __ALL_SITE_DATA__ before </head>."""
    inject = get_inject_script()
    if inject:
        html = html.replace("</head>", f"{inject}\n</head>")
        print("  [+] Injected __SITE_DEFAULTS__")
    else:
        print("  [i] No active site found (using defaults)")

    site_list = get_site_list_script()
    if site_list:
        html = html.replace("</head>", f"{site_list}\n</head>")
        print("  [+] Injected __SITE_LIST__")

    all_data = get_all_site_data_script()
    if all_data:
        html = html.replace("</head>", f"{all_data}\n</head>")
        print("  [+] Injected __ALL_SITE_DATA__")

    return html


def build_interactive_map() -> bool:
    """Build Output/InteractiveMap.html from src/index.html."""
    print()
    print("===========================================")
    print("  [1/2] InteractiveMap")
    print("===========================================")
    print()

    shell_path = SRC / "index.html"
    css_path = SRC / "css" / "style.css"

    if not shell_path.exists():
        print("  [ERROR] src/index.html not found")
        return False

    html = shell_path.read_text(encoding="utf-8")

    # Inline CSS
    if not css_path.exists():
        print("  [ERROR] src/css/style.css not found")
        return False
    css_content = css_path.read_text(encoding="utf-8")
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css" />',
        f"<style>\n{css_content}\n</style>",
    )
    print("  [+] Inlined: css/style.css")

    # Inline engine JS files
    for eng in ENGINES:
        eng_path = SRC / eng
        if not eng_path.exists():
            print(f"  [WARN] Missing: {eng}")
            continue
        js_content = eng_path.read_text(encoding="utf-8")
        html = html.replace(
            f'<script src="{eng}"></script>',
            f"<script>\n{js_content}\n</script>",
        )
        print(f"  [+] Inlined: {eng}")

    # Replace markers
    html = html.replace("Development Shell -->", "Compiled Build -->")
    html = html.replace(
        "<!-- Open with Live Server (VS Code Go Live). Run build.cmd to compile to InteractiveMap.html -->",
        "",
    )

    # Inject all 3 globals
    html = _inject_globals(html)

    # Write output
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_MAP.write_text(html, encoding="utf-8")

    print()
    print("  [DONE] Output/InteractiveMap.html")
    print()
    return True


def build_checklist() -> bool:
    """Build Output/PreApp_Checklist.html from src/checklist.html."""
    print("===========================================")
    print("  [2/2] PreApp_Checklist")
    print("===========================================")
    print()

    src_path = SRC / "checklist.html"
    if not src_path.exists():
        print("  [WARN] src/checklist.html not found -- skipping")
        return True

    html = src_path.read_text(encoding="utf-8")

    # Inject all 3 globals
    html = _inject_globals(html)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_CHK.write_text(html, encoding="utf-8")

    print()
    print("  [DONE] Output/PreApp_Checklist.html")
    print()
    return True


def copy_to_docs() -> None:
    """Copy Output/ HTML files to docs/ for GitHub Pages."""
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    for fname in ["InteractiveMap.html", "PreApp_Checklist.html"]:
        src = OUTPUT_DIR / fname
        dst = DOCS_DIR / fname
        if src.exists():
            shutil.copy2(src, dst)
    print("  [DOCS] Synced Output -> docs/")


# ── Dev server ────────────────────────────────────────────────────────────────

def serve(port: int = PORT) -> None:
    """Run local dev server matching PS1 serve mode."""
    import datetime
    from http.server import BaseHTTPRequestHandler, HTTPServer
    from urllib.parse import unquote

    EDITABLE_FIELDS = {
        "legalDescription", "yearBuilt", "occupancyGroup", "projectType",
        "architect", "notes", "scopeOfWork", "inspectors", "planningAreas",
        "overlayZones",
    }

    class Handler(BaseHTTPRequestHandler):
        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if self.path == "/checklist":
                self._serve_file(OUTPUT_CHK)
            elif self.path == "/api/sites":
                self._json_response(200, get_sites_api_json())
            else:
                self._serve_file(OUTPUT_MAP)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")

            if self.path == "/save":
                self._handle_save(body)
            elif self.path == "/backup-checklist":
                self._handle_backup(body)
            else:
                # Route pattern: /api/sites/{id}/activate or /api/sites/{id}/update-site
                m_activate = re.match(r"^/api/sites/([^/]+)/activate$", self.path)
                m_update = re.match(r"^/api/sites/([^/]+)/update-site$", self.path)
                if m_activate:
                    self._handle_activate(unquote(m_activate.group(1)))
                elif m_update:
                    self._handle_update_site(unquote(m_update.group(1)), body)
                else:
                    self.send_response(404)
                    self.end_headers()

        def _handle_save(self, body: str):
            """POST /save -- write to per-site file, preserve .site, overwrite .saved."""
            try:
                incoming = json.loads(body)
            except json.JSONDecodeError as e:
                print(f"  [SAVE ERROR] Bad JSON: {e}")
                self._json_response(400, json.dumps({"ok": False, "error": "invalid JSON"}))
                return

            target_id = incoming.get("siteId") or get_active_site_id()
            if not target_id:
                print("  [SAVE ERROR] No siteId in payload and no active site pointer")
                self._json_response(400, json.dumps({"ok": False, "error": "no active site"}))
                return

            site_file = get_site_file(target_id)
            if not site_file:
                print(f"  [SAVE ERROR] Site file not found for: {target_id}")
                self._json_response(404, json.dumps({"ok": False, "error": "site_not_found"}))
                return

            try:
                existing = _read_json(site_file)
                merged = {
                    "project": incoming.get("project", "ProjectBook-Planner"),
                    "site": existing.get("site"),
                    "saved": incoming.get("saved"),
                    "checklist": incoming.get("checklist"),
                }
                # Atomic write: write to temp then rename so a crash can't corrupt the file
                tmp = site_file.with_suffix(".tmp")
                tmp.write_text(json.dumps(merged, indent=2, ensure_ascii=False), encoding="utf-8")
                tmp.replace(site_file)
            except Exception as e:
                print(f"  [SAVE ERROR] Write failed: {e}")
                self._json_response(500, json.dumps({"ok": False, "error": str(e)}))
                return

            print(f"  [SAVE] {target_id} saved -- rebuilding...")
            build_interactive_map()
            build_checklist()
            copy_to_docs()
            print("  [SAVE] Done.")
            self._json_response(200, '{"ok":true}')

        def _handle_activate(self, site_id: str):
            """POST /api/sites/{id}/activate -- pointer update only, rebuild."""
            if not re.match(r"^[a-zA-Z0-9_-]+$", site_id):
                self._json_response(400, '{"ok":false,"error":"invalid site id"}')
                return
            if set_active_site(site_id):
                copy_to_docs()
                print(f"  [SITE] Activated: {site_id}")
                self._json_response(200, '{"ok":true}')
            else:
                self._json_response(404, '{"ok":false,"error":"site_not_found"}')

        def _handle_update_site(self, site_id: str, body: str):
            """POST /api/sites/{id}/update-site -- edit whitelisted .site fields."""
            site_file = get_site_file(site_id)
            if not site_file:
                self._json_response(404, '{"ok":false,"error":"site_not_found"}')
                return
            try:
                updates = json.loads(body)
                existing = _read_json(site_file)
                site_obj = existing.get("site", {})
                for field in EDITABLE_FIELDS:
                    if field in updates:
                        site_obj[field] = updates[field]
                existing["site"] = site_obj
                tmp = site_file.with_suffix(".tmp")
                tmp.write_text(json.dumps(existing, indent=2, ensure_ascii=False), encoding="utf-8")
                tmp.replace(site_file)
                build_interactive_map()
                build_checklist()
                copy_to_docs()
                print(f"  [EDIT] Site info updated + rebuilt.")
                self._json_response(200, '{"ok":true}')
            except Exception as e:
                self._json_response(500, json.dumps({"ok": False, "error": str(e)}))

        def _handle_backup(self, body: str):
            """POST /backup-checklist -- archive checklist JSON."""
            backup_dir = BASE / "config" / "backup"
            backup_dir.mkdir(parents=True, exist_ok=True)
            stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
            path = backup_dir / f"preapp-checklist-{stamp}.json"
            path.write_text(body, encoding="utf-8")
            self._json_response(200, '{"ok":true}')

        def _serve_file(self, filepath: Path):
            try:
                content = filepath.read_bytes()
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()

        def _json_response(self, code: int, body: str):
            self.send_response(code)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body.encode("utf-8"))

        def _cors(self):
            origin = self.headers.get("Origin", "")
            if origin and re.match(r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$", origin):
                self.send_header("Access-Control-Allow-Origin", origin)
            else:
                self.send_header("Access-Control-Allow-Origin", f"http://localhost:{port}")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def log_message(self, fmt, *args):
            pass  # quiet

    server = HTTPServer(("localhost", port), Handler)
    print()
    print("===========================================")
    print(f"  [LOCAL]  http://localhost:{port}           Map")
    print(f"           http://localhost:{port}/checklist  Checklist")
    print(f"  [PUBLIC] {PUBLIC_URL}")
    print(f"           {PUBLIC_URL}PreApp_Checklist.html")
    print("  Save Config writes directly to site JSON")
    print("  Press Ctrl+C to stop")
    print("===========================================")
    print()

    webbrowser.open(f"http://localhost:{port}/")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  [SERVE] Server stopped.")
        server.server_close()


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "build"

    ok = build_interactive_map()
    if not ok:
        sys.exit(1)
    build_checklist()
    copy_to_docs()

    print("===========================================")
    print()

    if mode == "debug":
        print("  [DEBUG] Opening in browser...")
        webbrowser.open(str(OUTPUT_MAP))
    elif mode == "serve":
        serve()


if __name__ == "__main__":
    main()
