/* ==========================================
   ENGINE 4: SETBACK & CONCEPT MODE
   ========================================== */
const SetbackEngine = {
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
        ExportEngine.save();
        const btn = document.getElementById('saveSetbackBtn');
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Setbacks'; btn.style.background = ''; }, 1800);
    },

    // Returns the building's axis-aligned bounding half-extents at a given orientation
    _buildingExtents: function(bldg) {
        const hw   = bldg.W / 2, hh = bldg.D / 2;
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
        document.getElementById('bldgW').value          = (bldg.W || 30).toFixed(1);
        document.getElementById('bldgD').value          = (bldg.D || 60).toFixed(1);
        document.getElementById('bldgOffsetX').value        = (bldg.offsetX      || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value        = (bldg.offsetY      || 0).toFixed(1);
        document.getElementById('bldgCount').value          = bldg.count         || 1;
        document.getElementById('bldgStackSpacing').value   = (bldg.stackSpacing || 0).toFixed(1);
        document.getElementById('bldgStories').value        = bldg.stories       || 1;
        document.getElementById('bldgFloorHeight').value    = (bldg.floorHeight  || 9).toFixed(1);

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
        const src     = state.buildings[state.activeBuilding] || state.buildings[0] || ConfigEngine.defaultBuilding;
        const last    = state.buildings[state.buildings.length - 1];
        const lastExt = this._buildingExtents(last);
        const newBldg = {
            orientation:  src.orientation,
            W:            src.W,
            D:            src.D,
            offsetX:      0,
            offsetY:      last.offsetY || 0,
            spacing:      0,
            count:        1,
            stackSpacing: 0,
            anchor:       'center',
            stories:      src.stories     || 1,
            floorHeight:  src.floorHeight || 9
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
        // Remove the active (selected) building, not just the last one
        const idx = state.activeBuilding;
        state.buildings.splice(idx, 1);
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
            const hw   = bldg.W / 2, hh = bldg.D / 2;
            const bRad = bldg.orientation * Math.PI / 180;
            const bCos = Math.cos(bRad), bSin = Math.sin(bRad);

            const rawCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const rawCy = (sideR - sideL) / 2 + (bldg.offsetY || 0);

            // Non-overlap first: push preCx past previous building if needed
            // Skip if free drag mode is active
            let preCx = rawCx;
            if (i > 0 && !state.freeDrag) {
                const prev       = buildings[i - 1];
                const prevExt    = this._buildingExtents(prev);
                const thisExt    = this._buildingExtents(bldg);
                const prevBaseCx = (prev.offsetX || 0) + (front - rear) / 2;
                preCx = Math.max(rawCx, prevBaseCx + prevExt.halfDepth + thisExt.halfDepth);
            }
            // Lot boundary is always enforced — buildings cannot leave the lot
            let baseCx, cy;
            ({ cx: baseCx, cy } = this._clampToLot(preCx, rawCy, bldg));

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

        this.updateBldgDimLabels();
        this.updateFAR();
    },

    updateBldgDimLabels: function() {
        MapEngine.bldgDimLabels.forEach(m => MapEngine.map.removeLayer(m));
        MapEngine.bldgDimLabels = [];
        if (!MapEngine.showBldgDims) return;

        const state  = ConfigEngine.state;
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

        const push = layer => { MapEngine.bldgDimLabels.push(layer); return layer; };
        const line = pts => push(L.polyline(pts.map(toLatLng), {
            color: '#1a202c', weight: 1.2, interactive: false, noClip: true
        }).addTo(MapEngine.map));
        const lbl = (pt, txt, rotDeg) => push(L.marker(toLatLng(pt), {
            icon: L.divIcon({
                className: '',
                html: '<div style="position:relative"><div class="arch-dim-label" style="font-size:' + bldgFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + rotDeg + 'deg)">' + txt + '</div></div>',
                iconSize: [0, 0], iconAnchor: [0, 0]
            }),
            interactive: false
        }).addTo(MapEngine.map));

        const EXT = 5;    // ft: dim line offset from building edge
        const EX2 = 2;    // ft: witness line overshoot beyond dim line
        const TK  = 2.2;  // ft: half-length of 45deg tick mark
        // Annotative text offset + zoom-scaled font
        const mapZoom  = MapEngine.map.getZoom();
        const bldgFontScale = Math.max(0.68, 0.34 + mapZoom * 0.024);
        const metersPerPx = 40075016.686 * Math.cos(ConfigEngine.state.lat * Math.PI / 180) / Math.pow(2, mapZoom + 8);
        const feetPerPx   = metersPerPx * 3.28084;
        const TO = 10 * feetPerPx;  // 10px gap, converted to feet at current zoom

        // Individual per-building dims replaced by chain dims below.

        // ── CHAIN DIMENSIONS ────────────────────────────────────────────────
        // Collects all boundary points along each axis, then draws one
        // continuous chain dim (shared witness lines at junctions).
        const { width: lotW, depth: lotD } = ConfigEngine.data;
        const lotHD = lotD / 2, lotHW = lotW / 2;
        const dimNorm = (a) => { a = ((a % 180) + 180) % 180; return a >= 90 ? a - 180 : a; };
        const clrDepthAngle = dimNorm(-state.rotation);
        const clrWidthAngle = dimNorm(-state.rotation - 90);

        // ── Collect boundary points ────────────────────────────────────────
        // Width chain (along y): building widths + inter-bldg gaps + lot clearances
        const wPts = [{ v: -lotHW }, { v: lotHW }];
        // Depth chain (along x): building heights + inter-copy gaps + lot clearances
        const dPts = [{ v: -lotHD }, { v: lotHD }];
        let chainRefX = null;   // fixed x for the width chain (front edge)
        let chainRefY = null;   // fixed y for the depth chain (left edge)

        state.buildings.forEach((bldg) => {
            const count  = bldg.count || 1;
            const ss     = bldg.stackSpacing || 0;
            const anchor = bldg.anchor || 'center';
            const { halfDepth, halfWidth } = this._buildingExtents(bldg);
            const step = halfDepth * 2 + ss;
            const aOff = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
            const baseCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const cy     = (sideR - sideL) / 2 + (bldg.offsetY || 0);
            const cxFirst = baseCx + (0 - aOff) * step;

            // Use first building's edges as the chain reference lines
            if (chainRefX === null) chainRefX = cxFirst - halfDepth;
            if (chainRefY === null) chainRefY = cy - halfWidth;

            // Width chain: building left/right edges
            wPts.push({ v: cy - halfWidth });
            wPts.push({ v: cy + halfWidth });

            // Depth chain: each copy's front/rear edges
            for (let j = 0; j < count; j++) {
                const cx = baseCx + (j - aOff) * step;
                dPts.push({ v: cx - halfDepth });
                dPts.push({ v: cx + halfDepth });
            }
        });

        // Deduplicate & sort
        const dedup = (arr) => {
            arr.sort((a, b) => a.v - b.v);
            const out = [arr[0]];
            for (let i = 1; i < arr.length; i++) {
                if (Math.abs(arr[i].v - out[out.length - 1].v) > 0.01) out.push(arr[i]);
            }
            return out;
        };
        const wChain = dedup(wPts);
        const dChain = dedup(dPts);

        // ── Draw chain helper ──────────────────────────────────────────────
        // Draws a full chain dim: shared witness lines + individual segments
        // Lines are draggable to reposition the chain perpendicular to its run.
        const drawChain = (chain, refCoord, isX, perpX, perpY, rotDeg, prefix) => {
            const chainLayers = [];
            const dimStyle = { color: '#1a202c', weight: 2, opacity: 1, interactive: true, noClip: true, className: 'chain-dim-line' };

            // Witness lines at every boundary
            chain.forEach((seg) => {
                const p = isX ? { x: seg.v, y: refCoord } : { x: refCoord, y: seg.v };
                const l = push(L.polyline([toLatLng(p), toLatLng({ x: p.x + (EXT+EX2)*perpX, y: p.y + (EXT+EX2)*perpY })], dimStyle).addTo(MapEngine.map));
                chainLayers.push(l);
            });

            // Dim segments between adjacent boundaries
            for (let i = 0; i < chain.length - 1; i++) {
                const v1 = chain[i].v, v2 = chain[i + 1].v;
                const dist = Math.abs(v2 - v1);
                if (dist < 0.5) continue;
                const dimKey = prefix + '_' + i;
                if (MapEngine.hiddenDimKeys.has(dimKey)) continue;

                const p1 = isX ? { x: v1, y: refCoord } : { x: refCoord, y: v1 };
                const p2 = isX ? { x: v2, y: refCoord } : { x: refCoord, y: v2 };
                const d1 = { x: p1.x + EXT*perpX, y: p1.y + EXT*perpY };
                const d2 = { x: p2.x + EXT*perpX, y: p2.y + EXT*perpY };
                const ux = (p2.x - p1.x) / dist, uy = (p2.y - p1.y) / dist;
                const mid = { x: (d1.x+d2.x)/2, y: (d1.y+d2.y)/2 };
                const tk45x = (ux + perpX) * 0.7071 * TK;
                const tk45y = (uy + perpY) * 0.7071 * TK;

                const layers = [];
                const pLine = pts => { const l = push(L.polyline(pts.map(toLatLng), dimStyle).addTo(MapEngine.map)); layers.push(l); chainLayers.push(l); };

                // Dim line split around label
                pLine([d1, { x: mid.x - TO*ux, y: mid.y - TO*uy }]);
                pLine([{ x: mid.x + TO*ux, y: mid.y + TO*uy }, d2]);
                // Ticks
                pLine([{ x: d1.x - tk45x, y: d1.y - tk45y }, { x: d1.x + tk45x, y: d1.y + tk45y }]);
                pLine([{ x: d2.x - tk45x, y: d2.y - tk45y }, { x: d2.x + tk45x, y: d2.y + tk45y }]);
                // Label
                const m = push(L.marker(toLatLng(mid), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="dim-label" style="font-size:' + bldgFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + rotDeg + 'deg)">' + dist.toFixed(1) + "'" + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: true
                }).addTo(MapEngine.map));
                layers.push(m); chainLayers.push(m);
                m.on('click', () => {
                    MapEngine.hiddenDimKeys.add(dimKey);
                    layers.forEach(l => MapEngine.map.removeLayer(l));
                });
            }
            return chainLayers;
        };

        // ── Draw the two chain dims ──────────────────────────────────────
        // Perpendicular flips outward: if chain is on the rear/right half, push further out
        const wRef = chainRefX + MapEngine.chainWOffset;
        const dRef = chainRefY + MapEngine.chainDOffset;
        const wPerpX = wRef > 0 ? 1 : -1;
        const dPerpY = dRef > 0 ? 1 : -1;
        let wLayers = drawChain(wChain, wRef, false, wPerpX, 0, clrWidthAngle, 'chain_w');
        let dLayers = drawChain(dChain, dRef, true, 0, dPerpY, clrDepthAngle, 'chain_d');

        // ── Drag-to-reposition via chain lines ──────────────────────────
        const rad = state.rotation * Math.PI / 180;
        const rCos = Math.cos(rad), rSin = Math.sin(rad);
        const toLocal = (ll) => {
            const rx = (ll.lng - state.lng) * F_LNG;
            const ry = (ll.lat - state.lat) * F_LAT;
            return { x: rx * rCos + ry * rSin, y: -rx * rSin + ry * rCos };
        };

        // Snap anchors: lot edges + all building boundaries
        const wAnchors = [-lotHD, lotHD];
        const dAnchors = [-lotHW, lotHW];
        state.buildings.forEach((bldg) => {
            const { halfDepth, halfWidth } = this._buildingExtents(bldg);
            const count  = bldg.count || 1;
            const ss     = bldg.stackSpacing || 0;
            const anchor = bldg.anchor || 'center';
            const step   = halfDepth * 2 + ss;
            const aOff   = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
            const baseCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const cy     = (sideR - sideL) / 2 + (bldg.offsetY || 0);
            for (let j = 0; j < count; j++) {
                const cx = baseCx + (j - aOff) * step;
                wAnchors.push(cx - halfDepth, cx + halfDepth);
            }
            dAnchors.push(cy - halfWidth, cy + halfWidth);
        });

        const snapTo = (val, anchors) => {
            let best = anchors[0], bestD = Math.abs(val - anchors[0]);
            for (let i = 1; i < anchors.length; i++) {
                const d = Math.abs(val - anchors[i]);
                if (d < bestD) { best = anchors[i]; bestD = d; }
            }
            return best;
        };

        // Attach drag behavior to all polylines in a chain
        const self = this;
        // Click dim line → visible drag handle appears offset from line.
        // Drag the handle to reposition. Click handle (or line again) to dismiss.
        let activeHandle  = null;   // the L.marker handle currently showing
        let activeDragOff = null;   // cleanup fn; null = no chain active

        const deactivateChain = () => {
            if (!activeDragOff) return;
            activeDragOff();
        };

        const attachChainDrag = (layers, chain, isX, perpX, perpY, offsetProp, baseRef, anchors, rotDeg, prefix, getLayers, setLayers) => {

            // Returns local coords for the handle — midpoint of chain, offset outward 7 ft past dim line
            const getHandlePt = () => {
                const curRef = baseRef + MapEngine[offsetProp];
                const midV   = (chain[0].v + chain[chain.length - 1].v) / 2;
                const sign   = curRef >= 0 ? 1 : -1;
                return isX
                    ? { x: midV, y: curRef + (EXT + 7) * sign }
                    : { x: curRef + (EXT + 7) * sign, y: midV };
            };

            layers.forEach(l => {
                if (!l.on || !(l instanceof L.Polyline)) return;
                l.on('click', (e) => {
                    L.DomEvent.stop(e.originalEvent);
                    if (MapEngine.dimDragMode) return;  // handles already shown by toggle
                    // If any chain active — deactivate it (including this one)
                    if (activeDragOff) { deactivateChain(); return; }

                    // Highlight chain lines
                    getLayers().forEach(ll => { if (ll._path) ll._path.classList.add('chain-dim-active'); });
                    MapEngine.map.dragging.disable();

                    // Create the drag handle marker
                    activeHandle = L.marker(toLatLng(getHandlePt()), {
                        draggable: true,
                        icon: L.divIcon({
                            className: '',
                            html: '<div class="chain-drag-handle"></div>',
                            iconSize:   [20, 20],
                            iconAnchor: [10, 10]
                        })
                    }).addTo(MapEngine.map);

                    activeHandle.on('drag', () => {
                        const loc    = toLocal(activeHandle.getLatLng());
                        const rawVal = isX ? loc.y : loc.x;
                        const snapped = snapTo(rawVal, anchors);
                        if (MapEngine[offsetProp] === snapped - baseRef) return;
                        MapEngine[offsetProp] = snapped - baseRef;
                        const newRef = baseRef + MapEngine[offsetProp];
                        const pX = isX ? perpX : (newRef > 0 ? 1 : -1);
                        const pY = isX ? (newRef > 0 ? 1 : -1) : perpY;
                        getLayers().forEach(ll => MapEngine.map.removeLayer(ll));
                        const newLayers = drawChain(chain, newRef, isX, pX, pY, rotDeg, prefix);
                        setLayers(newLayers);
                        // Re-highlight new layers and reposition handle
                        getLayers().forEach(ll => { if (ll._path) ll._path.classList.add('chain-dim-active'); });
                        activeHandle.setLatLng(toLatLng(getHandlePt()));
                    });

                    // Click handle to dismiss
                    activeHandle.on('click', (e2) => {
                        L.DomEvent.stop(e2.originalEvent);
                        deactivateChain();
                    });

                    activeDragOff = () => {
                        activeDragOff = null;
                        if (activeHandle) { MapEngine.map.removeLayer(activeHandle); activeHandle = null; }
                        MapEngine.map.dragging.enable();
                        getLayers().forEach(ll => { if (ll._path) ll._path.classList.remove('chain-dim-active'); });
                        self.updateBldgDimLabels();
                    };
                });
            });
        };

        attachChainDrag(wLayers, wChain, false, wPerpX, 0, 'chainWOffset', chainRefX, wAnchors, clrWidthAngle, 'chain_w',
            () => wLayers, (l) => { wLayers = l; });
        attachChainDrag(dLayers, dChain, true, 0, dPerpY, 'chainDOffset', chainRefY, dAnchors, clrDepthAngle, 'chain_d',
            () => dLayers, (l) => { dLayers = l; });

        // When drag mode is on, show handles immediately (no click needed)
        if (MapEngine.dimDragMode) {
            const autoHandle = (chain, isX, perpX, perpY, offsetProp, baseRef, anchors, rotDeg, prefix, getLayers, setLayers) => {
                const getHPt = () => {
                    const curRef = baseRef + MapEngine[offsetProp];
                    const midV   = (chain[0].v + chain[chain.length - 1].v) / 2;
                    const sign   = curRef >= 0 ? 1 : -1;
                    return isX ? { x: midV, y: curRef + (EXT + 7) * sign }
                               : { x: curRef + (EXT + 7) * sign, y: midV };
                };
                const handle = push(L.marker(toLatLng(getHPt()), {
                    draggable: true,
                    icon: L.divIcon({ className: '', html: '<div class="chain-drag-handle"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })
                }).addTo(MapEngine.map));
                handle.on('drag', () => {
                    const loc     = toLocal(handle.getLatLng());
                    const rawVal  = isX ? loc.y : loc.x;
                    const snapped = snapTo(rawVal, anchors);
                    if (MapEngine[offsetProp] === snapped - baseRef) return;
                    MapEngine[offsetProp] = snapped - baseRef;
                    const newRef = baseRef + MapEngine[offsetProp];
                    getLayers().forEach(ll => MapEngine.map.removeLayer(ll));
                    setLayers(drawChain(chain, newRef, isX, isX ? perpX : (newRef > 0 ? 1 : -1), isX ? (newRef > 0 ? 1 : -1) : perpY, rotDeg, prefix));
                    handle.setLatLng(toLatLng(getHPt()));
                });
            };
            autoHandle(wChain, false, wPerpX, 0, 'chainWOffset', chainRefX, wAnchors, clrWidthAngle, 'chain_w', () => wLayers, (l) => { wLayers = l; });
            autoHandle(dChain, true,  0, dPerpY, 'chainDOffset', chainRefY, dAnchors, clrDepthAngle, 'chain_d', () => dLayers, (l) => { dLayers = l; });
        }
    },

    updateFAR: function() {
        const state   = ConfigEngine.state;
        const { width: lotW, depth: lotD } = ConfigEngine.data;
        const lotArea = lotW * lotD;
        if (!lotArea) return;

        const sd        = window.__SITE_DEFAULTS__ || {};
        const commFront = state.commFront || false;
        const maxFAR    = commFront ? (sd.commFAR || 6.5) : (sd.baseFAR || 2.0);
        const buildable = Math.round(lotArea * maxFAR);

        const active      = state.buildings[state.activeBuilding] || state.buildings[0];
        const footprintSF = (active.W || 0) * (active.D || 0);

        // Total: sum per-building (footprint × count × stories)
        const totalArea = state.buildings.reduce((s, b) =>
            s + (b.W||0) * (b.D||0) * (b.count||1) * (b.stories||1), 0);
        const actualFAR = totalArea / lotArea;

        const set = (id, txt) => { const el = document.getElementById(id); if (!el) return; if (el.tagName === 'INPUT') el.value = txt; else el.textContent = txt; };

        set('bldgFootprintArea', Math.round(footprintSF).toLocaleString());
        set('bldgTotalArea',     Math.round(totalArea).toLocaleString()   + ' sf');
        set('bldgFAR',           actualFAR.toFixed(2));
        set('bldgBuildable',     'MAX ' + buildable.toLocaleString() + ' sf');
        set('maxFARLabel',       commFront ? 'Comm. Front: ' + maxFAR + ' FAR' : 'Base: ' + maxFAR + ' FAR');

        const chkEl = document.getElementById('bldgFARCheck');
        if (chkEl) {
            const ok = actualFAR <= maxFAR + 0.005;
            chkEl.textContent = ok
                ? '\u2713 Within limit (' + actualFAR.toFixed(2) + ' \u2264 ' + maxFAR + ')'
                : '\u2717 Exceeds limit (' + actualFAR.toFixed(2) + ' > ' + maxFAR + ')';
            chkEl.style.color = ok ? '#2f855a' : '#c53030';
        }

        const floorH      = active.floorHeight || 9;
        const activeStories = active.stories || 1;
        const totalHeight = activeStories * floorH + Math.max(0, activeStories - 1) * 1;
        set('bldgTotalHeight', totalHeight.toFixed(0));

        // Density check: total residential units vs base zone max
        const densPerSF = sd.densityPerSF || 600;
        const baseDMax  = Math.floor(lotArea / densPerSF);
        const resiU     = state.buildings.reduce((s, b) => s + (b.stories || 1) * (b.count || 1), 0);
        const sdbMin    = baseDMax + Math.ceil(baseDMax * 0.225); // 5% LI → 22.5% bonus
        const densEl    = document.getElementById('bldgDensity');
        const densChk   = document.getElementById('bldgDensityCheck');
        if (densEl)  densEl.textContent  = resiU + ' DU / ' + (commFront ? 'unlimited' : baseDMax + ' max');
        if (densChk) {
            if (commFront)         { densChk.textContent = '\u2713 CCHS: no limit'; densChk.style.color = '#2f855a'; }
            else if (resiU <= baseDMax) { densChk.textContent = '\u2713 Within base zone'; densChk.style.color = '#2f855a'; }
            else if (resiU <= sdbMin)   { densChk.textContent = '\u26a0 Needs SDB (min 5% aff)'; densChk.style.color = '#d97706'; }
            else                        { densChk.textContent = '\u2717 Exceeds base — use CCHS or SDB'; densChk.style.color = '#c53030'; }
        }
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

        const chk = document.getElementById('commFrontCheck');
        if (chk) chk.checked = state.commFront || false;

        // Auto-draw setbacks if they were explicitly applied in a prior session
        if (ConfigEngine.state.setbacksApplied) {
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
        ['bldgW', 'bldgD'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                bldg.W = parseFloat(document.getElementById('bldgW').value) || 30;
                bldg.D = parseFloat(document.getElementById('bldgD').value) || 60;
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
            let g = Math.max(0, parseFloat(document.getElementById('bldgStackSpacing').value) || 0);
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

        // Stories (per-building)
        document.getElementById('bldgStories').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            bldg.stories = parseInt(document.getElementById('bldgStories').value) || 1;
            this.updateFAR();
        });

        // Floor height (per-building)
        document.getElementById('bldgFloorHeight').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            bldg.floorHeight = parseFloat(document.getElementById('bldgFloorHeight').value) || 9;
            this.updateFAR();
        });

        // Comm. Front (global)
        if (chk) chk.addEventListener('change', () => {
            state.commFront = chk.checked;
            this.updateFAR();
            MapEngine.render();
            ExportEngine.save();
        });

        document.getElementById('bldgAddBtn').addEventListener('click', () => this.addBuilding());
        document.getElementById('bldgDelBtn').addEventListener('click', () => this.removeLastBuilding());
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        document.getElementById('bldgDimBtn').addEventListener('click', () => {
            const on = !MapEngine.showBldgDims;
            MapEngine.showBldgDims = on;
            MapEngine.showDims     = on;
            // Reset hidden dims when toggling — fresh slate each toggle cycle
            MapEngine.hiddenDimKeys.clear();
            const btn = document.getElementById('bldgDimBtn');
            btn.classList.toggle('active', on);
            btn.textContent = on ? 'Hide Dims' : 'Show Dims';
            this.updateBldgDimLabels();
            MapEngine.updateDimLabels();
        });

        // Restore dim toggle + hidden keys from saved config
        const dimsOn = state.showBldgDims || false;
        MapEngine.showBldgDims = dimsOn;
        MapEngine.showDims     = dimsOn;
        if (state.hiddenDimKeys) state.hiddenDimKeys.forEach(k => MapEngine.hiddenDimKeys.add(k));
        if (state.chainWOffset != null) MapEngine.chainWOffset = state.chainWOffset;
        if (state.chainDOffset != null) MapEngine.chainDOffset = state.chainDOffset;
        const dimBtn = document.getElementById('bldgDimBtn');
        dimBtn.classList.toggle('active', dimsOn);
        if (dimsOn) dimBtn.textContent = 'Hide Dims';

        if (state.buildings.length > 0) this.drawBuilding();
    },

    saveConfig: function() {
        ExportEngine.save();
        this.updateFAR();
        const btn = document.getElementById('saveConfigBtn');
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

