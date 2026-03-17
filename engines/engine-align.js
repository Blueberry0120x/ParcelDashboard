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

    // Clamp a building's base center so its full stack stays within the lot
    _clampToLot: function(cx, cy, bldg) {
        const { width: lotW, depth: lotD } = ConfigEngine.data;
        const count        = bldg.count        || 1;
        const stackSpacing = bldg.stackSpacing || 0;
        const anchor       = bldg.anchor       || 'center';
        const { halfDepth, halfWidth } = this._buildingExtents(bldg);
        const step  = halfDepth * 2 + stackSpacing;
        const aOff  = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
        const xMin  = -lotD / 2 + aOff * step + halfDepth;
        const xMax  =  lotD / 2 - (count - 1 - aOff) * step - halfDepth;
        const yMin  = -lotW / 2 + halfWidth;
        const yMax  =  lotW / 2 - halfWidth;
        return {
            cx: Math.max(xMin <= xMax ? xMin : -lotD/2, Math.min(xMin <= xMax ? xMax : lotD/2, cx)),
            cy: Math.max(yMin <= yMax ? yMin : -lotW/2, Math.min(yMin <= yMax ? yMax : lotW/2, cy))
        };
    },

    // ── Inter-building spacing helpers ────────────────────────────────────────

    _computeGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this._buildingExtents(prev);
        const thisExt = this._buildingExtents(bldg);
        return parseFloat((bldg.offsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
    },

    _maxGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const { depth: lotD } = ConfigEngine.data;
        const { front, rear } = state.setbacks;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this._buildingExtents(prev);
        const thisExt = this._buildingExtents(bldg);
        const count   = bldg.count        || 1;
        const sS      = bldg.stackSpacing || 0;
        const anchor  = bldg.anchor       || 'center';
        const step    = thisExt.halfDepth * 2 + sS;
        const aOff    = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
        const xMax       = lotD / 2 - (count - 1 - aOff) * step - thisExt.halfDepth;
        const maxOffsetX = xMax - (front - rear) / 2;
        return parseFloat((maxOffsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
    },

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
        MapEngine.buildingMarkers.forEach((m, i) => {
            if (!m._icon) return;
            const pin = m._icon.querySelector('.bldg-drag-pin');
            if (pin) pin.classList.toggle('active', i === idx);
        });
    },

    _seedInputsFromBuilding: function(idx) {
        const bldg = ConfigEngine.state.buildings[idx];
        if (!bldg) return;
        document.getElementById('bldgOrientInput').value    = bldg.orientation.toFixed(1);
        document.getElementById('bldgOrientSlider').value   = bldg.orientation;
        document.getElementById('bldgWidth').value          = (bldg.width        || 30).toFixed(1);
        document.getElementById('bldgHeight').value         = (bldg.height       || 60).toFixed(1);
        document.getElementById('bldgOffsetX').value        = (bldg.offsetX      || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value        = (bldg.offsetY      || 0).toFixed(1);
        document.getElementById('bldgCount').value          = bldg.count         || 1;
        document.getElementById('bldgStackSpacing').value   = (bldg.stackSpacing || 0).toFixed(1);

        // Inter-building spacing (S) — disabled for B1
        const spEl   = document.getElementById('bldgSpacing');
        const sHint  = document.getElementById('spacingHint');
        if (spEl) {
            if (idx > 0) {
                const gap    = this._computeGap(idx);
                const maxGap = this._maxGap(idx);
                spEl.value    = gap !== null ? gap.toFixed(1) : '0.0';
                spEl.disabled = false;
                if (sHint && maxGap !== null) {
                    sHint.title = 'Max: ' + maxGap.toFixed(1) + ' ft';
                    sHint.style.display = '';
                }
            } else {
                spEl.value    = '—';
                spEl.disabled = true;
                if (sHint) sHint.style.display = 'none';
            }
        }

        // Anchor buttons
        const anchorMap = { anchorFront: 'front', anchorCenter: 'center', anchorRear: 'rear' };
        const bldgAnchor = bldg.anchor || 'center';
        Object.keys(anchorMap).forEach(aId => {
            const el = document.getElementById(aId);
            if (el) el.classList.toggle('active', anchorMap[aId] === bldgAnchor);
        });

        this.updateFAR();
    },

    addBuilding: function() {
        const state   = ConfigEngine.state;
        const src     = state.buildings[state.activeBuilding] || state.buildings[0];
        const last    = state.buildings[state.buildings.length - 1];
        const lastExt = this._buildingExtents(last);
        const newBldg = {
            orientation:  src.orientation,
            width:        src.width,
            height:       src.height,
            offsetX:      0,
            offsetY:      last.offsetY || 0,
            spacing:      0,
            count:        1,
            stackSpacing: 0,
            anchor:       'center'
        };
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
        const state     = ConfigEngine.state;
        const buildings = state.buildings;
        const bCount    = buildings.length;

        // Sync outer poly array (one inner array per building entry)
        while (MapEngine.buildingPolys.length < bCount) MapEngine.buildingPolys.push([]);
        while (MapEngine.buildingPolys.length > bCount) {
            MapEngine.buildingPolys.pop().forEach(p => MapEngine.map.removeLayer(p));
        }

        // Sync marker array (one per building entry)
        while (MapEngine.buildingMarkers.length < bCount) {
            MapEngine.buildingMarkers.push(MapEngine.createBuildingMarker(MapEngine.buildingMarkers.length));
        }
        while (MapEngine.buildingMarkers.length > bCount) {
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
            const count        = bldg.count        || 1;
            const stackSpacing = bldg.stackSpacing || 0;
            const anchor       = bldg.anchor       || 'center';
            const hw   = bldg.width  / 2, hh = bldg.height / 2;
            const bRad = bldg.orientation * Math.PI / 180;
            const bCos = Math.cos(bRad), bSin = Math.sin(bRad);

            const rawCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const rawCy = (sideR - sideL) / 2 + (bldg.offsetY || 0);

            // Non-overlap first: push preCx past previous building if needed
            let preCx = rawCx;
            if (i > 0) {
                const prev       = buildings[i - 1];
                const prevExt    = this._buildingExtents(prev);
                const thisExt    = this._buildingExtents(bldg);
                const prevBaseCx = (prev.offsetX || 0) + (front - rear) / 2;
                preCx = Math.max(rawCx, prevBaseCx + prevExt.halfDepth + thisExt.halfDepth);
            }
            // Lot boundary is always the final constraint — clamp wins over non-overlap
            let { cx: baseCx, cy } = this._clampToLot(preCx, rawCy, bldg);

            // Update state if clamped or adjusted
            const newOX = parseFloat((baseCx - (front - rear) / 2).toFixed(1));
            const newOY = parseFloat((cy - (sideR - sideL) / 2).toFixed(1));
            if (newOX !== bldg.offsetX || newOY !== bldg.offsetY) {
                bldg.offsetX = newOX; bldg.offsetY = newOY;
                if (state.activeBuilding === i) {
                    const ox   = document.getElementById('bldgOffsetX');
                    const oy   = document.getElementById('bldgOffsetY');
                    const spEl = document.getElementById('bldgSpacing');
                    if (ox) ox.value = newOX.toFixed(1);
                    if (oy) oy.value = newOY.toFixed(1);
                    if (i > 0 && spEl && !spEl.disabled) spEl.value = this._computeGap(i).toFixed(1);
                }
            }

            // Sync inner polygon array for this building's stack
            if (!MapEngine.buildingPolys[i]) MapEngine.buildingPolys[i] = [];
            while (MapEngine.buildingPolys[i].length < count) {
                const p = L.polygon([], {
                    color: '#e67e22', weight: 2, fillColor: '#e67e22',
                    fillOpacity: 0.18, dashArray: '5 3', noClip: true
                }).addTo(MapEngine.map);
                MapEngine.buildingPolys[i].push(p);
            }
            while (MapEngine.buildingPolys[i].length > count) {
                MapEngine.map.removeLayer(MapEngine.buildingPolys[i].pop());
            }

            const halfDepth    = Math.abs(hh * bCos) + Math.abs(hw * bSin);
            const step         = halfDepth * 2 + stackSpacing;
            const anchorOffset = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;

            for (let j = 0; j < count; j++) {
                const cx  = baseCx + (j - anchorOffset) * step;
                const raw = [
                    { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
                    { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
                ];
                const oriented = raw.map(pt => {
                    const dx = pt.x - cx, dy = pt.y - cy;
                    return { x: cx + dx * bCos - dy * bSin, y: cy + dx * bSin + dy * bCos };
                });
                MapEngine.buildingPolys[i][j].setLatLngs(oriented.map(toLatLng));
            }

            if (!skipMarker) {
                MapEngine.buildingMarkers[i].setLatLng(toLatLng({ x: baseCx, y: cy }));
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

        const active      = state.buildings[state.activeBuilding] || state.buildings[0];
        const footprintSF = (active.width || 0) * (active.height || 0);

        // Total: sum of (footprint × count) across all buildings × stories
        const totalFootprint = state.buildings.reduce((s, b) => s + (b.width || 0) * (b.height || 0) * (b.count || 1), 0);
        const totalArea      = totalFootprint * stories;
        const actualFAR      = totalArea / lotArea;

        const set = (id, txt) => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'INPUT') el.value = txt; else el.textContent = txt; };

        set('bldgFootprintArea', Math.round(footprintSF).toLocaleString());
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

        const floorH      = state.floorHeight || 9;
        const totalHeight = stories === 1 ? floorH : stories * (floorH + 1);
        set('bldgTotalHeight', totalHeight.toFixed(0));
    },

    // ── Init wiring ───────────────────────────────────────────────────────────

    initBuildingConfig: function() {
        const state = ConfigEngine.state;
        const sb    = state.setbacks;

        document.getElementById('sb-front').value   = sb.front;
        document.getElementById('sb-rear').value    = sb.rear;
        document.getElementById('sb-side-l').value  = sb.sideL;
        document.getElementById('sb-side-r').value  = sb.sideR;

        this._seedInputsFromBuilding(state.activeBuilding);

        document.getElementById('bldgStories').value     = state.stories     || 1;
        document.getElementById('bldgFloorHeight').value = state.floorHeight || 9;
        const chk = document.getElementById('commFrontCheck');
        if (chk) chk.checked = state.commFront || false;

        if (localStorage.getItem('saved_setbacks')) {
            ConfigEngine.state.setbacksApplied = true;
            this.drawSetbacks();
        }

        this.rebuildSelector();

        document.getElementById('saveSetbackBtn').addEventListener('click', () => this.saveSetbacks());

        // Orientation
        const sldr = document.getElementById('bldgOrientSlider');
        const inp  = document.getElementById('bldgOrientInput');
        sldr.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            inp.value = v.toFixed(1);
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

        // Footprint
        ['bldgWidth', 'bldgHeight'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                bldg.width  = parseFloat(document.getElementById('bldgWidth').value)  || 30;
                bldg.height = parseFloat(document.getElementById('bldgHeight').value) || 60;
                this.drawBuilding();
            });
        });

        // Offset — back-compute inter-building gap when X changes
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

        // Inter-building spacing (S field)
        const spInp = document.getElementById('bldgSpacing');
        if (spInp) {
            spInp.addEventListener('change', () => {
                const idx = state.activeBuilding;
                if (idx <= 0) return;
                let gap = parseFloat(spInp.value);
                if (isNaN(gap)) return;
                gap = Math.max(0, gap);
                const maxGap = this._maxGap(idx);
                if (maxGap !== null) gap = Math.min(gap, maxGap);
                spInp.value = gap.toFixed(1);
                this._applyGap(idx, gap);
                this.drawBuilding();
            });
        }

        // Count (per-building stack copies) — capped so stack fits in lot
        document.getElementById('bldgCount').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            const { depth: lotD } = ConfigEngine.data;
            const ext  = this._buildingExtents(bldg);
            const sS   = bldg.stackSpacing || 0;
            const step = ext.halfDepth * 2 + sS;
            const maxN = Math.max(1, Math.floor((lotD + sS) / step));
            let n = Math.max(1, Math.min(parseInt(document.getElementById('bldgCount').value) || 1, maxN));
            document.getElementById('bldgCount').value = n;
            bldg.count = n;
            this.drawBuilding();
        });

        // Stack spacing — capped so full stack stays within lot; re-caps count if needed
        document.getElementById('bldgStackSpacing').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            const { depth: lotD } = ConfigEngine.data;
            const ext   = this._buildingExtents(bldg);
            const count = bldg.count || 1;
            let g = parseFloat(document.getElementById('bldgStackSpacing').value) || 0;
            if (count > 1) {
                const maxG = Math.max(0, parseFloat(((lotD - 2 * ext.halfDepth * count) / (count - 1)).toFixed(1)));
                g = Math.min(g, maxG);
                document.getElementById('bldgStackSpacing').value = g.toFixed(1);
            }
            bldg.stackSpacing = g;
            // Re-cap count in case new spacing reduces how many fit
            const newStep = ext.halfDepth * 2 + g;
            const newMaxN = Math.max(1, Math.floor((lotD + g) / newStep));
            if (count > newMaxN) {
                bldg.count = newMaxN;
                document.getElementById('bldgCount').value = newMaxN;
            }
            this.drawBuilding();
        });

        // Anchor buttons (per-building)
        const anchors   = ['anchorFront', 'anchorCenter', 'anchorRear'];
        const anchorMap = { anchorFront: 'front', anchorCenter: 'center', anchorRear: 'rear' };
        const setAnchor = (id) => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            anchors.forEach(a => document.getElementById(a).classList.toggle('active', a === id));
            bldg.anchor = anchorMap[id];
            this.drawBuilding();
        };
        anchors.forEach(id => document.getElementById(id).addEventListener('click', () => setAnchor(id)));

        // Stories (global)
        document.getElementById('bldgStories').addEventListener('change', () => {
            state.stories = parseInt(document.getElementById('bldgStories').value) || 1;
            this.updateFAR();
        });

        // Floor height (global)
        document.getElementById('bldgFloorHeight').addEventListener('change', () => {
            state.floorHeight = parseFloat(document.getElementById('bldgFloorHeight').value) || 9;
            this.updateFAR();
        });

        // Comm. Front (global)
        if (chk) chk.addEventListener('change', () => {
            state.commFront = chk.checked;
            this.updateFAR();
        });

        document.getElementById('bldgAddBtn').addEventListener('click', () => this.addBuilding());
        document.getElementById('bldgDelBtn').addEventListener('click', () => this.removeLastBuilding());
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        if (state.buildings.length > 0) this.drawBuilding();
    },

    saveConfig: function() {
        const btn   = document.getElementById('saveConfigBtn');
        const state = ConfigEngine.state;
        const bldg  = state.buildings[state.activeBuilding];
        if (bldg) {
            bldg.orientation  = parseFloat(document.getElementById('bldgOrientInput').value)  || 0;
            bldg.width        = parseFloat(document.getElementById('bldgWidth').value)        || 30;
            bldg.height       = parseFloat(document.getElementById('bldgHeight').value)       || 60;
            bldg.offsetX      = parseFloat(document.getElementById('bldgOffsetX').value)      || 0;
            bldg.offsetY      = parseFloat(document.getElementById('bldgOffsetY').value)      || 0;
            bldg.count        = parseInt(document.getElementById('bldgCount').value)          || 1;
            bldg.stackSpacing = parseFloat(document.getElementById('bldgStackSpacing').value) || 0;
        }
        state.stories     = parseInt(document.getElementById('bldgStories').value)        || 1;
        state.floorHeight = parseFloat(document.getElementById('bldgFloorHeight').value) || 9;
        state.commFront   = document.getElementById('commFrontCheck')?.checked           || false;
        localStorage.setItem('building_config', JSON.stringify({
            buildings:      state.buildings,
            activeBuilding: state.activeBuilding,
            stories:        state.stories,
            floorHeight:    state.floorHeight,
            commFront:      state.commFront
        }));
        this.updateFAR();
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
