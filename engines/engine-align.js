/* ==========================================
   ENGINE 4: SETBACK & CONCEPT MODE
   ========================================== */
const SetbackEngine = {
    setMode: function(mode) {
        ConfigEngine.state.mode = mode;
        document.getElementById('modeComplex').classList.toggle('active', mode === 'complex');
        document.getElementById('modeSingle').classList.toggle('active', mode === 'single');
    },

    applySetbacks: function() {
        const front = parseFloat(document.getElementById('sb-front').value)  || 0;
        const rear  = parseFloat(document.getElementById('sb-rear').value)   || 0;
        const sideL = parseFloat(document.getElementById('sb-side-l').value) || 0;
        const sideR = parseFloat(document.getElementById('sb-side-r').value) || 0;

        const { width: w, depth: h } = ConfigEngine.data;
        if (front + rear >= h || sideL + sideR >= w) {
            alert("Setbacks exceed lot dimensions — please reduce values.");
            return;
        }
        ConfigEngine.state.setbacks        = { front, rear, sideL, sideR };
        ConfigEngine.state.setbacksApplied = true;
        this.drawSetbacks();
    },

    saveSetbacks: function() {
        const btn = document.getElementById('saveSetbackBtn');
        const front = parseFloat(document.getElementById('sb-front').value)  || 0;
        const rear  = parseFloat(document.getElementById('sb-rear').value)   || 0;
        const sideL = parseFloat(document.getElementById('sb-side-l').value) || 0;
        const sideR = parseFloat(document.getElementById('sb-side-r').value) || 0;
        ConfigEngine.state.setbacks = { front, rear, sideL, sideR };
        localStorage.setItem('saved_setbacks', JSON.stringify(ConfigEngine.state.setbacks));
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Setbacks'; btn.style.background = ''; }, 1800);
    },

    // Returns the building's axis-aligned bounding half-extents at a given orientation
    _buildingExtents: function(bldg) {
        const hw   = bldg.width  / 2, hh = bldg.height / 2;
        const bRad = bldg.orientation * Math.PI / 180;
        const aC   = Math.abs(Math.cos(bRad)), aS = Math.abs(Math.sin(bRad));
        return {
            halfDepth: hh * aC + hw * aS,
            halfWidth: hh * aS + hw * aC
        };
    },

    // Clamp a single building's center to stay within the lot boundary
    _clampToLot: function(cx, cy, bldg) {
        const { width: lotW, depth: lotD } = ConfigEngine.data;
        const { halfDepth, halfWidth } = this._buildingExtents(bldg);
        const xMin = -lotD / 2 + halfDepth, xMax = lotD / 2 - halfDepth;
        const yMin = -lotW / 2 + halfWidth, yMax = lotW / 2 - halfWidth;
        return {
            cx: (xMin <= xMax) ? Math.max(xMin, Math.min(xMax, cx)) : 0,
            cy: (yMin <= yMax) ? Math.max(yMin, Math.min(yMax, cy)) : 0
        };
    },

    // ── Spacing helpers ───────────────────────────────────────────────────────

    // Gap in ft between building[idx] and building[idx-1] along the X axis
    _computeGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this._buildingExtents(prev);
        const thisExt = this._buildingExtents(bldg);
        return parseFloat((bldg.offsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
    },

    // Set building[idx].offsetX to achieve gap from building[idx-1]
    _applyGap: function(idx, gap) {
        const state = ConfigEngine.state;
        if (idx <= 0) return;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this._buildingExtents(prev);
        const thisExt = this._buildingExtents(bldg);
        bldg.offsetX = parseFloat((prev.offsetX + prevExt.halfDepth + thisExt.halfDepth + gap).toFixed(1));
        bldg.spacing = gap;
        const ox = document.getElementById('bldgOffsetX');
        if (ox && ConfigEngine.state.activeBuilding === idx) ox.value = bldg.offsetX.toFixed(1);
    },

    // ── Building selector UI ──────────────────────────────────────────────────

    rebuildSelector: function() {
        const state = ConfigEngine.state;
        const sel   = document.getElementById('bldgSelector');
        if (!sel) return;
        [...sel.querySelectorAll('.bldg-tab')].forEach(b => b.remove());
        const addBtn = sel.querySelector('.bldg-tab-add');
        state.buildings.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className   = 'bldg-tab' + (i === state.activeBuilding ? ' active' : '');
            btn.textContent = 'B' + (i + 1);
            btn.addEventListener('click', () => this.setActiveBuilding(i));
            sel.insertBefore(btn, addBtn);
        });
    },

    setActiveBuilding: function(idx) {
        const state = ConfigEngine.state;
        if (idx < 0 || idx >= state.buildings.length) return;
        state.activeBuilding = idx;
        this._seedInputsFromBuilding(idx);
        this.rebuildSelector();
        // Highlight the active marker
        MapEngine.buildingMarkers.forEach((m, i) => {
            if (!m._icon) return;
            const pin = m._icon.querySelector('.bldg-drag-pin');
            if (pin) pin.classList.toggle('active', i === idx);
        });
    },

    _seedInputsFromBuilding: function(idx) {
        const bldg = ConfigEngine.state.buildings[idx];
        if (!bldg) return;
        document.getElementById('bldgOrientInput').value  = bldg.orientation.toFixed(1);
        document.getElementById('bldgOrientSlider').value = bldg.orientation;
        document.getElementById('bldgWidth').value        = (bldg.width   || 30).toFixed(1);
        document.getElementById('bldgHeight').value       = (bldg.height  || 60).toFixed(1);
        document.getElementById('bldgOffsetX').value      = (bldg.offsetX || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value      = (bldg.offsetY || 0).toFixed(1);
        const spEl = document.getElementById('bldgSpacing');
        if (spEl) {
            if (idx > 0) {
                const gap = this._computeGap(idx);
                spEl.value    = gap !== null ? gap.toFixed(1) : '0.0';
                spEl.disabled = false;
            } else {
                spEl.value    = '—';
                spEl.disabled = true;
            }
        }
        this.updateFAR();
    },

    addBuilding: function() {
        const state = ConfigEngine.state;
        const src   = state.buildings[state.activeBuilding] || state.buildings[0];
        const last  = state.buildings[state.buildings.length - 1];
        const lastExt = this._buildingExtents(last);
        const newBldg = {
            orientation: src.orientation,
            width:       src.width,
            height:      src.height,
            offsetX:     0,
            offsetY:     last.offsetY || 0,
            spacing:     0
        };
        // Auto-position adjacent to last building (0-gap touch)
        const newExt    = this._buildingExtents(newBldg);
        newBldg.offsetX = parseFloat((last.offsetX + lastExt.halfDepth + newExt.halfDepth).toFixed(1));
        state.buildings.push(newBldg);
        state.activeBuilding = state.buildings.length - 1;
        this.rebuildSelector();
        this._seedInputsFromBuilding(state.activeBuilding);
        this.drawBuilding();
    },

    removeLastBuilding: function() {
        const state = ConfigEngine.state;
        if (state.buildings.length <= 1) return;
        state.buildings.pop();
        if (state.activeBuilding >= state.buildings.length) {
            state.activeBuilding = state.buildings.length - 1;
        }
        this.rebuildSelector();
        this._seedInputsFromBuilding(state.activeBuilding);
        this.drawBuilding();
    },

    // ── Core draw ─────────────────────────────────────────────────────────────

    drawBuilding: function(skipMarker) {
        if (!MapEngine.map) return;
        const state    = ConfigEngine.state;
        const buildings = state.buildings;
        const count    = buildings.length;

        // Sync polygon array
        while (MapEngine.buildingPolys.length < count) {
            const p = L.polygon([], {
                color: '#e67e22', weight: 2, fillColor: '#e67e22',
                fillOpacity: 0.18, dashArray: '5 3', noClip: true
            }).addTo(MapEngine.map);
            MapEngine.buildingPolys.push(p);
        }
        while (MapEngine.buildingPolys.length > count) {
            MapEngine.map.removeLayer(MapEngine.buildingPolys.pop());
        }

        // Sync marker array
        while (MapEngine.buildingMarkers.length < count) {
            MapEngine.buildingMarkers.push(MapEngine.createBuildingMarker(MapEngine.buildingMarkers.length));
        }
        while (MapEngine.buildingMarkers.length > count) {
            MapEngine.map.removeLayer(MapEngine.buildingMarkers.pop());
        }

        const { front, rear, sideL, sideR } = state.setbacks;
        const lRad  = state.rotation * Math.PI / 180;
        const lCos  = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);

        const toLatLng = pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        };

        buildings.forEach((bldg, i) => {
            const hw   = bldg.width  / 2, hh = bldg.height / 2;
            const bRad = bldg.orientation * Math.PI / 180;
            const bCos = Math.cos(bRad), bSin = Math.sin(bRad);

            const rawCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const rawCy = (sideR - sideL) / 2 + (bldg.offsetY || 0);
            const { cx, cy } = this._clampToLot(rawCx, rawCy, bldg);

            // Update state if clamped
            const newOX = parseFloat((cx - (front - rear) / 2).toFixed(1));
            const newOY = parseFloat((cy - (sideR - sideL) / 2).toFixed(1));
            if (newOX !== bldg.offsetX || newOY !== bldg.offsetY) {
                bldg.offsetX = newOX; bldg.offsetY = newOY;
                if (state.activeBuilding === i) {
                    const ox = document.getElementById('bldgOffsetX');
                    const oy = document.getElementById('bldgOffsetY');
                    if (ox) ox.value = newOX.toFixed(1);
                    if (oy) oy.value = newOY.toFixed(1);
                }
            }

            const raw = [
                { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
                { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
            ];
            const oriented = raw.map(pt => {
                const dx = pt.x - cx, dy = pt.y - cy;
                return { x: cx + dx * bCos - dy * bSin, y: cy + dx * bSin + dy * bCos };
            });
            MapEngine.buildingPolys[i].setLatLngs(oriented.map(toLatLng));

            if (!skipMarker) {
                MapEngine.buildingMarkers[i].setLatLng(toLatLng({ x: cx, y: cy }));
            }
        });

        // Highlight active marker
        MapEngine.buildingMarkers.forEach((m, i) => {
            if (!m._icon) return;
            const pin = m._icon.querySelector('.bldg-drag-pin');
            if (pin) pin.classList.toggle('active', i === state.activeBuilding);
        });

        this.updateFAR();
    },

    updateFAR: function() {
        const state   = ConfigEngine.state;
        const { width: lotW, depth: lotD } = ConfigEngine.data;
        const lotArea = lotW * lotD;
        if (!lotArea) return;

        const stories   = state.stories   || 1;
        const commFront = state.commFront || false;
        const maxFAR    = commFront ? 6.5 : 2.0;
        const buildable = Math.round(lotArea * maxFAR);

        // Active building footprint (for the badge in the Footprint row)
        const active      = state.buildings[state.activeBuilding] || state.buildings[0];
        const footprintSF = (active.width || 0) * (active.height || 0);

        // Total area = sum of all buildings × stories
        const totalFootprint = state.buildings.reduce((s, b) => s + (b.width || 0) * (b.height || 0), 0);
        const totalArea      = totalFootprint * stories;
        const actualFAR      = totalArea / lotArea;

        const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

        set('bldgFootprintArea', Math.round(footprintSF).toLocaleString() + ' sf');
        set('bldgTotalArea',     Math.round(totalArea).toLocaleString()   + ' sf');
        set('bldgFAR',           actualFAR.toFixed(2));
        set('bldgBuildable',     'MAX ' + buildable.toLocaleString() + ' sf');
        set('maxFARLabel',       commFront ? 'Comm. Front: 6.5 FAR' : 'Base: 2.0 FAR');

        const chkEl = document.getElementById('bldgFARCheck');
        if (chkEl) {
            const ok = actualFAR <= maxFAR + 0.005;
            chkEl.textContent = ok
                ? '\u2713 Within limit (' + actualFAR.toFixed(2) + ' \u2264 ' + maxFAR + ')'
                : '\u2717 Exceeds limit (' + actualFAR.toFixed(2) + ' > ' + maxFAR + ')';
            chkEl.style.color = ok ? '#2f855a' : '#c53030';
        }
    },

    // ── Init wiring ───────────────────────────────────────────────────────────

    initBuildingConfig: function() {
        const state = ConfigEngine.state;
        const sb    = state.setbacks;

        // Restore setback inputs
        document.getElementById('sb-front').value   = sb.front;
        document.getElementById('sb-rear').value    = sb.rear;
        document.getElementById('sb-side-l').value  = sb.sideL;
        document.getElementById('sb-side-r').value  = sb.sideR;

        // Seed building inputs from active building
        this._seedInputsFromBuilding(state.activeBuilding);

        // Global inputs
        document.getElementById('bldgStories').value = state.stories || 1;
        const chk = document.getElementById('commFrontCheck');
        if (chk) chk.checked = state.commFront || false;

        // Auto-restore setback lines if saved
        if (localStorage.getItem('saved_setbacks')) {
            ConfigEngine.state.setbacksApplied = true;
            this.drawSetbacks();
        }

        // Build selector tabs
        this.rebuildSelector();

        // Save Setbacks button
        document.getElementById('saveSetbackBtn').addEventListener('click', () => this.saveSetbacks());

        // Orientation slider <-> input sync
        const sldr = document.getElementById('bldgOrientSlider');
        const inp  = document.getElementById('bldgOrientInput');
        sldr.addEventListener('input', (e) => {
            const v    = parseFloat(e.target.value);
            inp.value  = v.toFixed(1);
            const bldg = state.buildings[state.activeBuilding];
            if (bldg) { bldg.orientation = v; this.drawBuilding(); }
        });
        inp.addEventListener('change', (e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v)) v = 0;
            v = Math.max(-90, Math.min(90, v));
            inp.value = v.toFixed(1); sldr.value = v;
            const bldg = state.buildings[state.activeBuilding];
            if (bldg) { bldg.orientation = v; this.drawBuilding(); }
        });

        // Footprint inputs
        ['bldgWidth', 'bldgHeight'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                bldg.width  = parseFloat(document.getElementById('bldgWidth').value)  || 30;
                bldg.height = parseFloat(document.getElementById('bldgHeight').value) || 60;
                this.drawBuilding();
            });
        });

        // Offset inputs — back-compute spacing when X changes
        ['bldgOffsetX', 'bldgOffsetY'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const idx  = state.activeBuilding;
                const bldg = state.buildings[idx];
                if (!bldg) return;
                bldg.offsetX = parseFloat(document.getElementById('bldgOffsetX').value) || 0;
                bldg.offsetY = parseFloat(document.getElementById('bldgOffsetY').value) || 0;
                if (idx > 0) {
                    const gap = this._computeGap(idx);
                    bldg.spacing = gap !== null ? gap : 0;
                    const spEl = document.getElementById('bldgSpacing');
                    if (spEl) spEl.value = bldg.spacing.toFixed(1);
                }
                this.drawBuilding();
            });
        });

        // Spacing input — reposition building to achieve the requested gap
        const spInp = document.getElementById('bldgSpacing');
        if (spInp) {
            spInp.addEventListener('change', () => {
                const idx = state.activeBuilding;
                if (idx <= 0) return;
                const gap = parseFloat(spInp.value);
                if (isNaN(gap)) return;
                this._applyGap(idx, gap);
                this.drawBuilding();
            });
        }

        // Stories (global)
        document.getElementById('bldgStories').addEventListener('change', () => {
            state.stories = parseInt(document.getElementById('bldgStories').value) || 1;
            this.updateFAR();
        });

        // Comm. Front (global)
        if (chk) chk.addEventListener('change', () => {
            state.commFront = chk.checked;
            this.updateFAR();
        });

        // Add / Remove building buttons
        document.getElementById('bldgAddBtn').addEventListener('click', () => this.addBuilding());
        document.getElementById('bldgDelBtn').addEventListener('click', () => this.removeLastBuilding());

        // Save Config button
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        // Draw on load if buildings exist
        if (state.buildings.length > 0) this.drawBuilding();
    },

    saveConfig: function() {
        const btn   = document.getElementById('saveConfigBtn');
        const state = ConfigEngine.state;
        // Flush active building's current input values into state
        const bldg = state.buildings[state.activeBuilding];
        if (bldg) {
            bldg.orientation = parseFloat(document.getElementById('bldgOrientInput').value) || 0;
            bldg.width       = parseFloat(document.getElementById('bldgWidth').value)       || 30;
            bldg.height      = parseFloat(document.getElementById('bldgHeight').value)      || 60;
            bldg.offsetX     = parseFloat(document.getElementById('bldgOffsetX').value)     || 0;
            bldg.offsetY     = parseFloat(document.getElementById('bldgOffsetY').value)     || 0;
        }
        state.stories   = parseInt(document.getElementById('bldgStories').value) || 1;
        state.commFront = document.getElementById('commFrontCheck')?.checked || false;
        localStorage.setItem('building_config', JSON.stringify({
            buildings:      state.buildings,
            activeBuilding: state.activeBuilding,
            stories:        state.stories,
            commFront:      state.commFront
        }));
        this.drawBuilding();
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Config'; btn.style.background = ''; }, 1800);
    },

    drawSetbacks: function() {
        const { front, rear, sideL, sideR } = ConfigEngine.state.setbacks;
        const { width: w, depth: h }         = ConfigEngine.data;

        const setbackRect = [
            { x: -h/2 + front, y:  w/2 - sideR },
            { x:  h/2 - rear,  y:  w/2 - sideR },
            { x:  h/2 - rear,  y: -w/2 + sideL },
            { x: -h/2 + front, y: -w/2 + sideL }
        ];

        const rad   = ConfigEngine.state.rotation * Math.PI / 180;
        const cos   = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const transform = (pt) => {
            let rx = pt.x * cos - pt.y * sin;
            let ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        MapEngine.setbackPoly.setLatLngs(setbackRect.map(transform));
    }
};
