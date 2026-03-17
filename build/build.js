#!/usr/bin/env node
/**
 * build.js — Compiles modular src/ files into a single dist/InteractiveMap.html
 *
 * Usage:  node build/build.js
 *         node build/build.js --inject data/site-data.json
 *
 * What it does:
 *   1. Reads src/index.html as the shell
 *   2. Inlines <link href="css/style.css"> → <style>…</style>
 *   3. Inlines each <script src="js/…"> → <script>…</script>
 *   4. Optionally injects window.__SITE_DEFAULTS__ from site-data.json
 *   5. Replaces "Development Shell" → "Compiled Build"
 *   6. Writes dist/InteractiveMap.html
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// ── Parse args ───────────────────────────────────────────────────────────────
let siteDataPath = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--inject' && args[i + 1]) {
        siteDataPath = path.resolve(ROOT, args[i + 1]);
        i++;
    }
}

// ── Read shell ───────────────────────────────────────────────────────────────
let html = fs.readFileSync(path.join(SRC, 'index.html'), 'utf8');

// ── Inline CSS ───────────────────────────────────────────────────────────────
html = html.replace(
    /<link\s+rel="stylesheet"\s+href="css\/style\.css"\s*\/?\s*>/,
    () => {
        const css = fs.readFileSync(path.join(SRC, 'css', 'style.css'), 'utf8');
        return '<style>\n' + css + '</style>';
    }
);

// ── Inline JS ────────────────────────────────────────────────────────────────
html = html.replace(
    /<script\s+src="js\/([\w-]+\.js)"><\/script>/g,
    (match, filename) => {
        const jsPath = path.join(SRC, 'js', filename);
        if (!fs.existsSync(jsPath)) {
            console.error('ERROR: Missing source file:', jsPath);
            process.exit(1);
        }
        const js = fs.readFileSync(jsPath, 'utf8');
        return '<script>\n' + js + '</script>';
    }
);

// ── Inject site-data.json (optional) ─────────────────────────────────────────
if (siteDataPath && fs.existsSync(siteDataPath)) {
    const siteData = fs.readFileSync(siteDataPath, 'utf8');
    const injection = '<script>\nwindow.__SITE_DEFAULTS__ = ' + siteData.trim() + ';\n</script>';
    html = html.replace('</head>', injection + '\n</head>');
    console.log('Injected site-data from:', siteDataPath);
}

// ── Tag as compiled ──────────────────────────────────────────────────────────
html = html.replace('Development Shell', 'Compiled Build');

// ── Write output ─────────────────────────────────────────────────────────────
if (!fs.existsSync(DIST)) fs.mkdirSync(DIST, { recursive: true });
const outPath = path.join(DIST, 'InteractiveMap.html');
fs.writeFileSync(outPath, html, 'utf8');

// Also copy to root for backwards compat
const rootCopy = path.join(ROOT, 'InteractiveMap.html');
fs.writeFileSync(rootCopy, html, 'utf8');

const lines = html.split('\n').length;
console.log('Build complete: ' + lines + ' lines → ' + outPath);
console.log('Root copy     → ' + rootCopy);
