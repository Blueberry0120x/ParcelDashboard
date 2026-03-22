#!/usr/bin/env python3
"""
build.py - Replicates Engine_InteractiveParcelMap.ps1 build pipeline.
Compiles src/ into Output/InteractiveMap.html and Output/PreApp_Checklist.html.
"""
import json
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(BASE, "src")
OUTPUT_DIR = os.path.join(BASE, "Output")
SITE_DATA = os.path.join(BASE, "data", "site-data.json")
SITES_DIR = os.path.join(BASE, "data", "sites")

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


def get_active_site_id():
    """Determine the active site ID from site-data.json filename match."""
    if not os.path.exists(SITES_DIR):
        return None
    try:
        with open(SITE_DATA, "r", encoding="utf-8") as f:
            active = json.load(f)
        active_apn = active.get("site", {}).get("apn", "")
        for fname in os.listdir(SITES_DIR):
            if not fname.endswith(".json"):
                continue
            fpath = os.path.join(SITES_DIR, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                sd = json.load(f)
            if sd.get("site", {}).get("apn") == active_apn:
                return fname.replace(".json", "")
    except Exception:
        pass
    return None


def get_inject_script():
    """Merge site-data.json site + saved into window.__SITE_DEFAULTS__."""
    if not os.path.exists(SITE_DATA):
        return ""
    try:
        with open(SITE_DATA, "r", encoding="utf-8") as f:
            sd = json.load(f)
        merged = {}
        if sd.get("site"):
            merged.update(sd["site"])
        if sd.get("saved"):
            merged.update(sd["saved"])
        # Inject siteId so client can detect site switches
        site_id = get_active_site_id()
        if site_id:
            merged["siteId"] = site_id
        if merged:
            j = json.dumps(merged, separators=(",", ":"))
            return f"<script>window.__SITE_DEFAULTS__ = {j};</script>"
    except Exception as e:
        print(f"  [WARN] site-data.json parse error: {e}")
    return ""


def build_interactive_map():
    """Build Output/InteractiveMap.html from src/index.html."""
    print()
    print("===========================================")
    print("  [1/2] InteractiveMap")
    print("===========================================")
    print()

    shell_path = os.path.join(SRC, "index.html")
    css_path = os.path.join(SRC, "css", "style.css")

    if not os.path.exists(shell_path):
        print("  [ERROR] src/index.html not found")
        return False

    with open(shell_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Inline CSS
    if not os.path.exists(css_path):
        print("  [ERROR] src/css/style.css not found")
        return False
    with open(css_path, "r", encoding="utf-8") as f:
        css_content = f.read()
    html = html.replace(
        '<link rel="stylesheet" href="css/style.css" />',
        f"<style>\n{css_content}\n</style>",
    )
    print("  [+] Inlined: css/style.css")

    # Inline engine JS files
    for eng in ENGINES:
        eng_path = os.path.join(SRC, eng)
        if not os.path.exists(eng_path):
            print(f"  [WARN] Missing: {eng}")
            continue
        with open(eng_path, "r", encoding="utf-8") as f:
            js_content = f.read()
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

    # Inject site-data.json
    inject = get_inject_script()
    if inject:
        html = html.replace("</head>", f"{inject}\n</head>")
        print("  [+] Injected settings from site-data.json")
    else:
        print("  [i] No site-data.json settings found (using defaults)")

    # Write output
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "InteractiveMap.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print()
    print("  [DONE] Output/InteractiveMap.html")
    print()
    return True


def build_checklist():
    """Build Output/PreApp_Checklist.html from src/checklist.html."""
    print("===========================================")
    print("  [2/2] PreApp_Checklist")
    print("===========================================")
    print()

    src_path = os.path.join(SRC, "checklist.html")
    if not os.path.exists(src_path):
        print("  [WARN] src/checklist.html not found -- skipping")
        return True

    with open(src_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Inject site-data.json
    inject = get_inject_script()
    if inject:
        html = html.replace("</head>", f"{inject}\n</head>")
        print("  [+] Injected settings from site-data.json")

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    out_path = os.path.join(OUTPUT_DIR, "PreApp_Checklist.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print()
    print("  [DONE] Output/PreApp_Checklist.html")
    print()
    return True


def copy_to_docs():
    """Copy Output/ HTML files to docs/ for GitHub Pages."""
    import shutil
    docs_dir = os.path.join(BASE, "docs")
    os.makedirs(docs_dir, exist_ok=True)
    for fname in ["InteractiveMap.html", "PreApp_Checklist.html"]:
        src = os.path.join(OUTPUT_DIR, fname)
        dst = os.path.join(docs_dir, fname)
        if os.path.exists(src):
            shutil.copy2(src, dst)
            print(f"  [+] Copied to docs/{fname}")


def serve(port=7734):
    """Run a local dev server matching the PS1 serve mode."""
    from http.server import HTTPServer, BaseHTTPRequestHandler
    import datetime

    output_map = os.path.join(OUTPUT_DIR, "InteractiveMap.html")
    output_chk = os.path.join(OUTPUT_DIR, "PreApp_Checklist.html")

    class Handler(BaseHTTPRequestHandler):
        def do_OPTIONS(self):
            self.send_response(204)
            self._cors()
            self.end_headers()

        def do_GET(self):
            if self.path == "/checklist":
                self._serve_file(output_chk)
            elif self.path == "/api/sites":
                self._handle_list_sites()
            else:
                self._serve_file(output_map)

        def do_POST(self):
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")

            if self.path == "/save":
                self._handle_save(body)
            elif self.path.startswith("/api/sites/") and self.path.endswith("/activate"):
                site_id = self.path.split("/api/sites/")[1].replace("/activate", "")
                self._handle_activate_site(site_id)
            elif self.path == "/backup-checklist":
                self._handle_backup(body)
            else:
                self.send_response(404)
                self.end_headers()

        def _handle_save(self, body):
            try:
                incoming = json.loads(body)
                # Preserve site key
                if os.path.exists(SITE_DATA):
                    with open(SITE_DATA, "r", encoding="utf-8") as f:
                        existing = json.load(f)
                    if existing.get("site"):
                        merged = {
                            "project": incoming.get("project", "Master Site Dashboard"),
                            "site": existing["site"],
                            "saved": incoming.get("saved"),
                            "checklist": incoming.get("checklist"),
                        }
                        body = json.dumps(merged, indent=2)
                with open(SITE_DATA, "w", encoding="utf-8") as f:
                    f.write(body)
                # Write back to active site file so per-site state persists
                active_id = get_active_site_id()
                if active_id:
                    site_file = os.path.join(SITES_DIR, f"{active_id}.json")
                    import shutil
                    shutil.copy2(SITE_DATA, site_file)
                print(f"  [SAVE] site-data.json updated - rebuilding...")
                build_interactive_map()
                build_checklist()
                print(f"  [SAVE] Done. Refresh browser to load new defaults.")
            except Exception as e:
                print(f"  [SAVE ERROR] {e}")
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')

        def _handle_list_sites(self):
            """GET /api/sites - list available site configs."""
            sites = []
            active_id = get_active_site_id()
            if os.path.exists(SITES_DIR):
                for fname in sorted(os.listdir(SITES_DIR)):
                    if not fname.endswith(".json"):
                        continue
                    sid = fname.replace(".json", "")
                    try:
                        with open(os.path.join(SITES_DIR, fname), "r", encoding="utf-8") as f:
                            sd = json.load(f)
                        site = sd.get("site", {})
                        sites.append({
                            "id": sid,
                            "address": site.get("address", sid),
                            "apn": site.get("apn", ""),
                            "active": sid == active_id,
                        })
                    except Exception:
                        continue
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(sites).encode())

        def _handle_activate_site(self, site_id):
            """POST /api/sites/{id}/activate - switch active site."""
            import shutil
            site_file = os.path.join(SITES_DIR, f"{site_id}.json")
            if not os.path.exists(site_file):
                self.send_response(404)
                self.end_headers()
                self.wfile.write(b'{"error":"site not found"}')
                return
            shutil.copy2(site_file, SITE_DATA)
            print(f"  [SITE] Activated: {site_id} - rebuilding...")
            build_interactive_map()
            build_checklist()
            print(f"  [SITE] Done. Browser will reload.")
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "siteId": site_id}).encode())

        def _handle_backup(self, body):
            backup_dir = os.path.join(BASE, "config", "backup")
            os.makedirs(backup_dir, exist_ok=True)
            stamp = datetime.datetime.now().strftime("%Y-%m-%d_%H%M%S")
            path = os.path.join(backup_dir, f"preapp-checklist-{stamp}.json")
            with open(path, "w", encoding="utf-8") as f:
                f.write(body)
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok":true}')

        def _serve_file(self, filepath):
            try:
                with open(filepath, "rb") as f:
                    content = f.read()
                self.send_response(200)
                self._cors()
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(content)))
                self.end_headers()
                self.wfile.write(content)
            except FileNotFoundError:
                self.send_response(404)
                self.end_headers()

        def _cors(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

        def log_message(self, fmt, *args):
            # Quieter logging
            pass

    server = HTTPServer(("localhost", port), Handler)
    print()
    print("===========================================")
    print(f"  [SERVE] http://localhost:{port}           Map")
    print(f"          http://localhost:{port}/checklist  Checklist")
    print("  Save Config writes directly to site-data.json")
    print("  Press Ctrl+C to stop")
    print("===========================================")
    print()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  [SERVE] Server stopped.")
        server.server_close()


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "build"

    ok = build_interactive_map()
    if not ok:
        sys.exit(1)
    build_checklist()
    copy_to_docs()
    print("===========================================")
    print()

    if mode == "serve":
        serve()
