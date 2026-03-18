/* ==========================================
   ENGINE 5: EXPORT
   ========================================== */
const ExportEngine = {
    generateLISP: function() {
        const latlngs = MapEngine.lotPoly.getLatLngs()[0];
        proj4.defs(ConfigEngine.cad.projection, ConfigEngine.cad.proj4Def);

        let out = ";; ==========================================\n";
        out += ";; AUTOLISP BOUNDARY SCRIPT - " + ConfigEngine.data.apn + "\n";
        out += ";; Rotation Angle: " + ConfigEngine.state.rotation.toFixed(1) + " degrees\n";
        out += ";; System: CA State Plane Zone 6 (Intl Ft)\n";
        out += ";; ==========================================\n\n(command \"_pline\"\n";

        const ptNames = ["Pt 1 (Front Left)", "Pt 2 (Back Left)", "Pt 3 (Back Right)", "Pt 4 (Front Right)"];
        latlngs.forEach((pt, i) => {
            const ca = proj4("WGS84", ConfigEngine.cad.projection, [pt.lng, pt.lat]);
            out += "  \"" + ca[0].toFixed(4) + "," + ca[1].toFixed(4) + "\"   ;; " + ptNames[i] + "\n";
        });
        out += "  \"c\"\n)\n(command \"_zoom\" \"e\")\n(princ \"\\nLot Plotted.\")\n(princ)";
        document.getElementById('outputCoords').value = out;

        // Internal copy — persist to localStorage for Python/build pipeline access
        const state = {
            apn:      ConfigEngine.data.apn,
            address:  ConfigEngine.data.address,
            lat:      ConfigEngine.state.lat,
            lng:      ConfigEngine.state.lng,
            rotation: ConfigEngine.state.rotation,
            setbacks: ConfigEngine.state.setbacks,
            lisp:     out
        };
        ConfigEngine.save();
        localStorage.setItem('last_lisp_export', JSON.stringify(state, null, 2));

        // Download copy
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'site-calibration_' + ConfigEngine.data.apn + '.json';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
    },

    saveBoundary: function() {
        const state = {
            apn:      ConfigEngine.data.apn,
            address:  ConfigEngine.data.address,
            lat:      ConfigEngine.state.lat,
            lng:      ConfigEngine.state.lng,
            rotation: ConfigEngine.state.rotation,
            setbacks: ConfigEngine.state.setbacks
        };
        // Save internally — tool remembers position across sessions
        ConfigEngine.save();
        localStorage.setItem('boundary_location', JSON.stringify(state, null, 2));
        this.pushToServer();
        // Button feedback
        const btn = document.getElementById('saveBoundaryBtn');
        const orig = btn.textContent;
        btn.textContent = 'Saved!';
        btn.style.background = '#38a169';
        setTimeout(() => { btn.textContent = orig; btn.style.removeProperty('background'); }, 1500);
    },

    exportImage: function() {
        html2canvas(document.getElementById('map'), { useCORS: true, allowTaint: false, backgroundColor: null })
            .then(canvas => {
                const link = document.createElement('a');
                link.download = `Vicinity_Map_${ConfigEngine.data.apn}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            })
            .catch(() => {
                alert("Image export blocked by tile server security. Use the Fullscreen button and take a screenshot instead.");
            });
    },

    // Shared payload builder — single source of truth for all persisted state.
    // Every save path (localStorage, server, export) reads from here.
    // When adding a new field: add it here FIRST, then wire init() + restore.
    _payload: function() {
        const s = ConfigEngine.state;
        return {
            project: 'Master Site Dashboard',
            saved: {
                lat:            s.lat,
                lng:            s.lng,
                rotation:       s.rotation,
                locked:         s.locked,
                setbacks:       s.setbacks,
                buildings:      s.buildings,
                activeBuilding: s.activeBuilding,
                commFront:      s.commFront,
                showBldgDims:   MapEngine.showBldgDims,
                hiddenDimKeys:  [...MapEngine.hiddenDimKeys],
                chainWOffset:   MapEngine.chainWOffset,
                chainDOffset:   MapEngine.chainDOffset,
                mapOpacity:     s.mapOpacity
            }
        };
    },

    // Silent background push to local dev server — no-op when not on localhost
    pushToServer: function() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
        fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this._payload(), null, 2)
        }).catch(function() {});
    },

    // Master save — explicit button with visual feedback
    saveToFile: function() {
        const btn = document.getElementById('saveSettingsBtn');
        const _ok = () => { if (btn) { btn.textContent = 'Saved!'; btn.style.background = '#2f855a'; setTimeout(() => { btn.textContent = 'Save to File'; btn.style.background = ''; }, 1800); } };

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.pushToServer();
            _ok();
            return;
        }
        // file:// fallback: download
        const blob = new Blob([JSON.stringify(this._payload(), null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'site-data.json'; a.click();
        URL.revokeObjectURL(a.href);
        _ok();
    }
};

