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
        localStorage.setItem('last_lisp_export', JSON.stringify(state, null, 2));

        // Save all state + download LISP file
        this.save();
        const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.download = 'site-calibration_' + ConfigEngine.data.apn + '.json';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
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

    // ══════════════════════════════════════════════════════════════════
    //  SINGLE SAVE — every button in the app calls this ONE function.
    //  1. Syncs all UI inputs -> ConfigEngine.state
    //  2. Writes _payload() to ONE localStorage key
    //  3. Pushes to dev server (no-op outside localhost)
    //  4. Shows flash badge
    // ══════════════════════════════════════════════════════════════════
    save: function() {
        const s = ConfigEngine.state;

        // ── Sync setback inputs ──
        const sbF = document.getElementById('sb-front');
        if (sbF) {
            s.setbacks = {
                front: parseFloat(sbF.value) || 0,
                rear:  parseFloat(document.getElementById('sb-rear').value) || 0,
                sideL: parseFloat(document.getElementById('sb-side-l').value) || 0,
                sideR: parseFloat(document.getElementById('sb-side-r').value) || 0
            };
        }

        // ── Sync active building inputs ──
        const bldg = s.buildings[s.activeBuilding];
        if (bldg) {
            const el = function(id) { return document.getElementById(id); };
            if (el('bldgOrientInput'))  bldg.orientation  = parseFloat(el('bldgOrientInput').value) || 0;
            if (el('bldgW'))            bldg.W            = parseFloat(el('bldgW').value) || 30;
            if (el('bldgD'))            bldg.D            = parseFloat(el('bldgD').value) || 60;
            if (el('bldgOffsetX'))      bldg.offsetX      = parseFloat(el('bldgOffsetX').value) || 0;
            if (el('bldgOffsetY'))      bldg.offsetY      = parseFloat(el('bldgOffsetY').value) || 0;
            if (el('bldgCount'))        bldg.count        = parseInt(el('bldgCount').value) || 1;
            if (el('bldgStackSpacing')) bldg.stackSpacing  = parseFloat(el('bldgStackSpacing').value) || 0;
            if (el('bldgStories'))      bldg.stories      = parseInt(el('bldgStories').value) || 1;
            if (el('bldgFloorHeight'))  bldg.floorHeight  = parseFloat(el('bldgFloorHeight').value) || 9;
            var anchors = {anchorFront:'front', anchorCenter:'center', anchorRear:'rear'};
            Object.keys(anchors).forEach(function(id) {
                var btn = document.getElementById(id);
                if (btn && btn.classList.contains('active')) bldg.anchor = anchors[id];
            });
        }

        // ── Sync toggles ──
        var cf = document.getElementById('commFrontCheck');
        if (cf) s.commFront = cf.checked;
        if (typeof MapEngine !== 'undefined' && MapEngine.showBldgDims != null) {
            s.showBldgDims = MapEngine.showBldgDims;
        }

        // ── Persist: ONE key ──
        try { localStorage.setItem('site_state', JSON.stringify(this._payload())); }
        catch(e) { console.warn('Save to localStorage failed:', e.message); }

        // ── Push to dev server (no-op outside localhost) ──
        this._pushToServer();

        // ── Flash badge ──
        this._showFlash();
    },

    // Shared payload builder -- single source of truth for all persisted state.
    _payload: function() {
        var s = ConfigEngine.state;
        var payload = {
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
                showBldgDims:   (typeof MapEngine !== 'undefined') ? MapEngine.showBldgDims : s.showBldgDims,
                hiddenDimKeys:  (typeof MapEngine !== 'undefined' && MapEngine.hiddenDimKeys) ? [...MapEngine.hiddenDimKeys] : [],
                chainWOffset:   (typeof MapEngine !== 'undefined') ? MapEngine.chainWOffset : 0,
                chainDOffset:   (typeof MapEngine !== 'undefined') ? MapEngine.chainDOffset : 0,
                mapOpacity:     s.mapOpacity,
                setbacksApplied: s.setbacksApplied,
                vehicles:       s.vehicles || [],
                activeVehicle:  s.activeVehicle ?? -1
            }
        };
        // Include checklist state if available (shared localStorage on same origin)
        try {
            var ckRaw = null;
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf('preapp_') === 0) { ckRaw = localStorage.getItem(k); break; }
            }
            if (ckRaw) payload.checklist = JSON.parse(ckRaw);
        } catch(e) {}
        return payload;
    },

    // Show the fixed save flash badge for 2 seconds
    _showFlash: function() {
        var el = document.getElementById('map-save-flash');
        if (!el) return;
        if (this._flashTimer) clearTimeout(this._flashTimer);
        el.style.display = 'block';
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        this._flashTimer = setTimeout(function() { el.style.display = 'none'; }, 2000);
    },

    // Silent background push to local dev server
    _pushToServer: function() {
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') return;
        fetch('/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this._payload(), null, 2)
        }).catch(function() {});
    },

    // Save to File button — save() + download on file://
    saveToFile: function() {
        this.save();
        var btn = document.getElementById('saveSettingsBtn');
        if (btn) { btn.textContent = 'Saved!'; btn.style.background = '#2f855a'; setTimeout(function() { btn.textContent = 'Save to File'; btn.style.background = ''; }, 1800); }
        // file:// fallback: also download
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            var blob = new Blob([JSON.stringify(this._payload(), null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob); a.download = 'site-data.json'; a.click();
            URL.revokeObjectURL(a.href);
        }
    },

    // FAB download — save() + always download JSON
    downloadConfig: function() {
        this.save();
        var blob = new Blob([JSON.stringify(this._payload(), null, 2)], { type: 'application/json' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'site-data.json';
        a.click();
        URL.revokeObjectURL(a.href);
    }
};
