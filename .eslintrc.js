// ESLint config for ProjectBook-Planner
// Enforces Engine Contract boundaries — see .claude/skills/engine-contract/SKILL.md
//
// Run:  npx eslint src/js/
// Fix:  npx eslint src/js/ --fix

/** @type {import('eslint').Linter.Config} */
module.exports = {
    env: {
        browser: true,
        es2021: true,
    },
    parserOptions: {
        ecmaVersion: 2021,
        sourceType: "script",
    },
    // Globals: engines loaded as plain script tags (no modules)
    globals: {
        L: "readonly",          // Leaflet
        ConfigEngine: "readonly",
        MapEngine: "readonly",
        SetbackEngine: "readonly",
        ExportEngine: "readonly",
        UIEngine: "readonly",
        ElevationTool: "readonly",
        ResizeEngine: "readonly",
    },
    rules: {
        // ── Engine Contract Rules ─────────────────────────────────────────
        //
        // Rule: Frame A (lat/lng) conversions live in MapEngine only.
        // Block any engine calling toLatLng/toLocal except MapEngine itself.
        // (MapEngine defines them; other engines must call MapEngine.toLatLng)
        //
        // Rule: ExportEngine.save() is the ONLY write path.
        // Calling localStorage.setItem directly is forbidden.
        "no-restricted-syntax": [
            "error",
            {
                // Direct localStorage writes — must go through ExportEngine.save()
                "selector": "CallExpression[callee.object.name='localStorage'][callee.property.name='setItem']",
                "message": "Engine Contract V7: use ExportEngine.save() — direct localStorage.setItem is forbidden."
            }
        ],
        "no-restricted-globals": [
            "error",
            {
                "name": "localStorage",
                "message": "Engine Contract V7: access localStorage only through ExportEngine — never directly."
            }
        ],

        // ── General quality rules ──────────────────────────────────────────
        "no-unused-vars": ["warn", { "vars": "all", "args": "after-used", "ignoreRestSiblings": true }],
        "no-undef": "error",
        "eqeqeq": ["error", "always"],
        "no-console": "off",   // console.warn/log used intentionally for diagnostics
    },

    // Per-file overrides: each engine file may define its own globals
    overrides: [
        {
            files: ["src/js/engine-map.js"],
            rules: {
                // MapEngine IS allowed to use localStorage (through ExportEngine, but it
                // calls ExportEngine.save() which may read/write state — allow the ref here)
                "no-restricted-globals": "off",
                "no-restricted-syntax": "off",
            }
        },
        {
            files: ["src/js/engine-export.js"],
            rules: {
                // ExportEngine owns the write path — allowed to use localStorage directly
                "no-restricted-globals": "off",
                "no-restricted-syntax": "off",
            }
        }
    ]
};
