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


IPHONE_META = """\
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <meta name="theme-color" content="#0f4c81">
    <link rel="apple-touch-icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%230c3d6b' width='100' height='100' rx='20'/><text y='.78em' x='.12em' font-size='72'>&#x1f3d7;</text></svg>">
"""

IPHONE_CSS = """
<style>
/* iPhone safe-area + touch overrides */
body {
    -webkit-tap-highlight-color: transparent;
    overscroll-behavior: none;
    -webkit-overflow-scrolling: touch;
    padding-top: env(safe-area-inset-top);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
    padding-bottom: env(safe-area-inset-bottom);
}
input, select, textarea { font-size: 16px !important; }
input[type=checkbox] { width: 22px; height: 22px; accent-color: #0f4c81; }
button { -webkit-appearance: none; touch-action: manipulation; }
</style>
"""


def build_iphone_map():
    """Build Output/InteractiveMap_Mobile.html with iPhone/PWA enhancements."""
    print("===========================================")
    print("  [3/4] InteractiveMap (iPhone)")
    print("===========================================")
    print()

    web_path = os.path.join(OUTPUT_DIR, "InteractiveMap.html")
    if not os.path.exists(web_path):
        print("  [ERROR] Output/InteractiveMap.html must be built first")
        return False

    with open(web_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Replace viewport meta with iPhone-optimized version
    html = html.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        "",
    )

    # Add iPhone meta tags after <meta charset>
    html = html.replace(
        '<meta charset="UTF-8">',
        '<meta charset="UTF-8">\n' + IPHONE_META,
    )
    print("  [+] Added PWA / iPhone meta tags")

    # Add iPhone CSS before </head>
    html = html.replace("</head>", IPHONE_CSS + "</head>")
    print("  [+] Added safe-area + touch CSS")

    # Update title for mobile
    html = html.replace(
        "<title>Master Site Analysis Dashboard</title>",
        "<title>Site Map | 4335 Euclid</title>",
    )

    # Add mobile-specific CSS overrides for the sidebar layout
    mobile_layout_css = """
<style>
/* Mobile layout: stack sidebar above map */
@media (max-width: 767px) {
    .main-container { flex-direction: column !important; height: auto !important; }
    .sidebar { width: 100% !important; max-height: none !important; overflow: visible !important; }
    .col-divider { display: none !important; }
    .map-panel { height: 55vh !important; min-height: 350px; }
    #map { min-height: 350px; }
    .info-bottom { flex-direction: column !important; }
    .info-col-left, .info-col-right { width: 100% !important; }
    .info-col-gap { display: none !important; }
    .property-banner { flex-wrap: wrap; gap: 4px; }
    .banner-stat { min-width: 120px; flex: 1 1 auto; }
    .header-title-row { flex-direction: column !important; gap: 6px !important; }
    .suite-bar-ext { display: none !important; }
    #map-fab { bottom: calc(16px + env(safe-area-inset-bottom)) !important; }
}
</style>
"""
    html = html.replace("</head>", mobile_layout_css + "</head>")
    print("  [+] Added mobile layout overrides")

    out_path = os.path.join(OUTPUT_DIR, "InteractiveMap_Mobile.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print()
    print("  [DONE] Output/InteractiveMap_Mobile.html")
    print()
    return True


def build_iphone_checklist():
    """Build Output/PreApp_Checklist_Mobile.html with iPhone/PWA enhancements."""
    print("===========================================")
    print("  [4/4] PreApp_Checklist (iPhone)")
    print("===========================================")
    print()

    web_path = os.path.join(OUTPUT_DIR, "PreApp_Checklist.html")
    if not os.path.exists(web_path):
        print("  [ERROR] Output/PreApp_Checklist.html must be built first")
        return False

    with open(web_path, "r", encoding="utf-8") as f:
        html = f.read()

    # Replace viewport meta
    html = html.replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
        "",
    )

    # Add iPhone meta after charset
    html = html.replace(
        '<meta charset="UTF-8">',
        '<meta charset="UTF-8">\n'
        + IPHONE_META.replace("Site Map", "Checklist"),
    )
    print("  [+] Added PWA / iPhone meta tags")

    # Add iPhone CSS
    html = html.replace("</head>", IPHONE_CSS + "</head>")
    print("  [+] Added safe-area + touch CSS")

    # Update title
    html = html.replace(
        "<title>Pre-App Checklist | 4335 Euclid Ave | CUPD-CU-2-4</title>",
        "<title>Checklist | 4335 Euclid</title>",
    )

    # Add error overlay for mobile debugging (matches legacy pattern)
    error_box = """<div id="err-box" style="display:none;position:fixed;inset:0;z-index:99999;background:#fff;padding:20px;overflow:auto;font-family:monospace;font-size:13px;color:#dc2626;white-space:pre-wrap;word-break:break-all"></div>
<noscript><div style="padding:40px 20px;text-align:center;font-family:system-ui">JavaScript is required. Enable it in Settings &gt; Safari.</div></noscript>
<script>
window.onerror=function(m,s,l,c,e){var box=document.getElementById('err-box');if(box){box.style.display='block';box.textContent+='ERROR: '+m+'\\nLine: '+l+', Col: '+c+'\\n'+(e&&e.stack?e.stack:'')+'\\n\\n';}};
</script>
"""
    html = html.replace("</body>", error_box + "</body>")
    print("  [+] Added mobile error overlay")

    out_path = os.path.join(OUTPUT_DIR, "PreApp_Checklist_Mobile.html")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)

    print()
    print("  [DONE] Output/PreApp_Checklist_Mobile.html")
    print()
    return True


if __name__ == "__main__":
    ok = build_interactive_map()
    if not ok:
        sys.exit(1)
    build_checklist()
    build_iphone_map()
    build_iphone_checklist()
    print("===========================================")
    print()
