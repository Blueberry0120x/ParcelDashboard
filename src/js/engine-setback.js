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
    buildingExtents: function(bldg) {
        const hw   = bldg.W / 2, hh = bldg.D / 2;
        const bRad = bldg.orientation * Math.PI / 180;
        const aC   = Math.abs(Math.cos(bRad)), aS = Math.abs(Math.sin(bRad));
        return {
            halfDepth: hh * aC + hw * aS,
            halfWidth: hh * aS + hw * aC
        };
    },

    // Clamp a building's base center so its full stack stays within the lot
    clampToLot: function(cx, cy, bldg) {
        const { width: lotW, depth: lotD, parcelPolygon: pp } = ConfigEngine.data;
        const count        = bldg.count        || 1;
        const stackSpacing = bldg.stackSpacing || 0;
        const stackAngle   = bldg.stackAngle   || 0;
        const anchor       = bldg.anchor       || 'center';
        const hw   = bldg.W / 2, hh = bldg.D / 2;
        const bRad = bldg.orientation * Math.PI / 180;
        const bCos = Math.cos(bRad), bSin = Math.sin(bRad);
        const { halfDepth, halfWidth } = this.buildingExtents(bldg);

        const sAngRad   = stackAngle * Math.PI / 180;
        const sDirX     = Math.cos(sAngRad);
        const sDirY     = Math.sin(sAngRad);
        const halfInDir = Math.abs(hh * (bCos * sDirX + bSin * sDirY)) +
                          Math.abs(hw * (-bSin * sDirX + bCos * sDirY));
        const step = halfInDir * 2 + stackSpacing;
        const aOff = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;

        // Compute bounding box of ALL copies relative to anchor (cx,cy)
        const jOff0 = -aOff * step, jOffN = (count - 1 - aOff) * step;
        const arrXMin = Math.min(jOff0 * sDirX, jOffN * sDirX) - halfDepth;
        const arrXMax = Math.max(jOff0 * sDirX, jOffN * sDirX) + halfDepth;
        const arrYMin = Math.min(jOff0 * sDirY, jOffN * sDirY) - halfWidth;
        const arrYMax = Math.max(jOff0 * sDirY, jOffN * sDirY) + halfWidth;

        // For polygon sites, compute actual lot extents in local coords
        if (pp && pp.length > 2) {
            var pn = pp.length;
            if (pp[pn-1][0]===pp[0][0] && pp[pn-1][1]===pp[0][1]) pn--;
            var cLat = 0, cLng = 0;
            for (var i = 0; i < pn; i++) { cLat += pp[i][0]; cLng += pp[i][1]; }
            cLat /= pn; cLng /= pn;
            var F_LAT = 364566, F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);
            var rad = ConfigEngine.state.rotation * Math.PI / 180;
            var lc = Math.cos(rad), ls = Math.sin(rad);
            var mnX = Infinity, mxX = -Infinity, mnY = Infinity, mxY = -Infinity;
            for (var i = 0; i < pn; i++) {
                var ry = (pp[i][0] - cLat) * F_LAT, rx = (pp[i][1] - cLng) * F_LNG;
                var lx = rx * lc + ry * ls, ly = ry * lc - rx * ls;
                if (lx < mnX) mnX = lx; if (lx > mxX) mxX = lx;
                if (ly < mnY) mnY = ly; if (ly > mxY) mxY = ly;
            }
            // Use actual asymmetric polygon bounds directly (not symmetric ±half)
            const xMin = mnX - arrXMin;
            const xMax = mxX - arrXMax;
            const yMin = mnY - arrYMin;
            const yMax = mxY - arrYMax;
            return {
                cx: Math.max(xMin <= xMax ? xMin : mnX, Math.min(xMin <= xMax ? xMax : mxX, cx)),
                cy: Math.max(yMin <= yMax ? yMin : mnY, Math.min(yMin <= yMax ? yMax : mxY, cy))
            };
        }

        const lotHD = lotD / 2, lotHW = lotW / 2;
        const xMin = -lotHD - arrXMin;
        const xMax =  lotHD - arrXMax;
        const yMin = -lotHW - arrYMin;
        const yMax =  lotHW - arrYMax;
        return {
            cx: Math.max(xMin <= xMax ? xMin : -lotHD, Math.min(xMin <= xMax ? xMax : lotHD, cx)),
            cy: Math.max(yMin <= yMax ? yMin : -lotHW, Math.min(yMin <= yMax ? yMax : lotHW, cy))
        };
    },

    // ── Inter-building spacing helpers ────────────────────────────────────────

    _computeGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this.buildingExtents(prev);
        const thisExt = this.buildingExtents(bldg);
        return parseFloat((bldg.offsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
    },

    _maxGap: function(idx) {
        const state = ConfigEngine.state;
        if (idx <= 0 || idx >= state.buildings.length) return null;
        const { depth: lotD } = ConfigEngine.data;
        const { front, rear } = state.setbacks;
        const prev    = state.buildings[idx - 1];
        const bldg    = state.buildings[idx];
        const prevExt = this.buildingExtents(prev);
        const thisExt = this.buildingExtents(bldg);
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
        const prevExt = this.buildingExtents(prev);
        const thisExt = this.buildingExtents(bldg);
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
        var normOri = ((bldg.orientation % 360) + 360) % 360;
        bldg.orientation = normOri;
        document.getElementById('bldgOrientInput').value    = normOri.toFixed(1);
        document.getElementById('bldgOrientSlider').value   = normOri;
        document.getElementById('bldgW').value          = (bldg.W || 30).toFixed(1);
        document.getElementById('bldgD').value          = (bldg.D || 60).toFixed(1);
        document.getElementById('bldgOffsetX').value        = (bldg.offsetX      || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value        = (bldg.offsetY      || 0).toFixed(1);
        document.getElementById('bldgCount').value          = bldg.count         || 1;
        document.getElementById('bldgStackSpacing').value   = (bldg.stackSpacing || 0).toFixed(1);
        const sAng   = bldg.stackAngle || 0;
        const angEl  = document.getElementById('bldgStackAngle');
        const dirBtn = document.getElementById('bldgStackDirBtn');
        if (angEl)  angEl.value = sAng;
        const angSlider = document.getElementById('bldgStackAngleSlider');
        if (angSlider) angSlider.value = sAng;
        if (dirBtn) dirBtn.textContent = sAng < 1 ? '→' : Math.abs(sAng - 90) < 1 ? '↑' : Math.abs(sAng - 180) < 1 ? '←' : Math.abs(sAng - 270) < 1 ? '↓' : '∠';
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
        const lastExt = this.buildingExtents(last);
        const newBldg = {
            orientation:  src.orientation,
            W:            src.W,
            D:            src.D,
            offsetX:      0,
            offsetY:      last.offsetY || 0,
            spacing:      0,
            count:        1,
            stackSpacing: 0,
            stackAngle:   0,
            anchor:       'center',
            stories:      src.stories     || 1,
            floorHeight:  src.floorHeight || 9
        };
        const newExt    = this.buildingExtents(newBldg);
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
        const toLatLng = pt => MapEngine.toLatLng(pt, state);

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
                const prevExt    = this.buildingExtents(prev);
                const thisExt    = this.buildingExtents(bldg);
                const prevBaseCx = (prev.offsetX || 0) + (front - rear) / 2;
                preCx = Math.max(rawCx, prevBaseCx + prevExt.halfDepth + thisExt.halfDepth);
            }
            // Lot boundary is always enforced — buildings cannot leave the lot
            let baseCx, cy;
            ({ cx: baseCx, cy } = this.clampToLot(preCx, rawCy, bldg));

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

            const sAngRad      = ((bldg.stackAngle || 0) * Math.PI / 180);
            const sDirX        = Math.cos(sAngRad);
            const sDirY        = Math.sin(sAngRad);
            const halfInDir    = Math.abs(hh * (bCos * sDirX + bSin * sDirY)) +
                                 Math.abs(hw * (-bSin * sDirX + bCos * sDirY));
            const step         = halfInDir * 2 + stackSpacing;
            const anchorOffset = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;

            for (let j = 0; j < count; j++) {
                const jOff = (j - anchorOffset) * step;
                const cx   = baseCx + jOff * sDirX;
                const cy_j = cy     + jOff * sDirY;
                const raw = [
                    { x: cx - hh, y: cy_j + hw }, { x: cx + hh, y: cy_j + hw },
                    { x: cx + hh, y: cy_j - hw }, { x: cx - hh, y: cy_j - hw }
                ];
                const oriented = raw.map(pt => {
                    const dx = pt.x - cx, dy = pt.y - cy_j;
                    return { x: cx + dx * bCos - dy * bSin, y: cy_j + dx * bSin + dy * bCos };
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
        const toLatLng = pt => MapEngine.toLatLng(pt, state);
        const lRad  = state.rotation * Math.PI / 180;
        const lCos  = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);

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
        const TK  = 1.2;  // ft: half-length of 45deg tick mark
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
        const { width: lotW, depth: lotD, parcelPolygon: chainPP } = ConfigEngine.data;
        var lotHD = lotD / 2, lotHW = lotW / 2;
        // For polygon sites, derive lot extents from actual polygon geometry
        var polyLocalVerts = null;
        if (chainPP && chainPP.length > 2) {
            var cpn = chainPP.length;
            if (chainPP[cpn-1][0]===chainPP[0][0] && chainPP[cpn-1][1]===chainPP[0][1]) cpn--;
            var ccLat = 0, ccLng = 0;
            for (var ci = 0; ci < cpn; ci++) { ccLat += chainPP[ci][0]; ccLng += chainPP[ci][1]; }
            ccLat /= cpn; ccLng /= cpn;
            polyLocalVerts = [];
            var cMinX = Infinity, cMaxX = -Infinity, cMinY = Infinity, cMaxY = -Infinity;
            for (var ci = 0; ci < cpn; ci++) {
                var cry = (chainPP[ci][0] - ccLat) * F_LAT;
                var crx = (chainPP[ci][1] - ccLng) * F_LNG;
                var clx = crx * lCos + cry * lSin;
                var cly = cry * lCos - crx * lSin;
                polyLocalVerts.push({ x: clx, y: cly });
                if (clx < cMinX) cMinX = clx; if (clx > cMaxX) cMaxX = clx;
                if (cly < cMinY) cMinY = cly; if (cly > cMaxY) cMaxY = cly;
            }
            lotHD = (cMaxX - cMinX) / 2;
            lotHW = (cMaxY - cMinY) / 2;
        }
        // Helper: find polygon extent along one axis at a given perpendicular position
        // isX=true → scan along Y at X=pos; isX=false → scan along X at Y=pos
        var polyExtentAt = function(pos, isX) {
            if (!polyLocalVerts) return null;
            var mn = Infinity, mx = -Infinity, n = polyLocalVerts.length;
            for (var i = 0; i < n; i++) {
                var a = polyLocalVerts[i], b = polyLocalVerts[(i+1)%n];
                var aP = isX ? a.x : a.y, bP = isX ? b.x : b.y;
                if ((aP - pos) * (bP - pos) > 0) continue; // both on same side
                if (Math.abs(bP - aP) < 0.001) continue;
                var t = (pos - aP) / (bP - aP);
                var cross = isX ? (a.y + t*(b.y - a.y)) : (a.x + t*(b.x - a.x));
                if (cross < mn) mn = cross;
                if (cross > mx) mx = cross;
            }
            return mn < Infinity ? { min: mn, max: mx } : null;
        };
        const dimNorm = (a) => { a = ((a % 180) + 180) % 180; return a >= 90 ? a - 180 : a; };
        const clrDepthAngle = dimNorm(-state.rotation);
        const clrWidthAngle = dimNorm(-state.rotation - 90);

        // ── Collect boundary points ────────────────────────────────────────
        // Use actual lot extents (accounts for chamfer + polygon geometry)
        const wPts = [{ v: -lotHW }, { v: lotHW }];
        const dPts = [{ v: -lotHD }, { v: lotHD }];
        let chainRefX = null;   // fixed x for the width chain (front edge)
        let chainRefY = null;   // fixed y for the depth chain (left edge)

        state.buildings.forEach((bldg, bIdx) => {
            const count  = bldg.count || 1;
            const ss     = bldg.stackSpacing || 0;
            const anchor = bldg.anchor || 'center';
            const { halfDepth, halfWidth } = this.buildingExtents(bldg);
            const step = halfDepth * 2 + ss;
            const aOff = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;
            const baseCx = (front - rear) / 2 + (bldg.offsetX || 0);
            const cy     = (sideR - sideL) / 2 + (bldg.offsetY || 0);
            const cxFirst = baseCx + (0 - aOff) * step;

            // Use first building's edges as the chain reference lines
            if (chainRefX === null) chainRefX = cxFirst - halfDepth;
            if (chainRefY === null) chainRefY = cy - halfWidth;

            // Width chain: tag with pairId + trueLen so label shows perpendicular W, not bbox projection
            wPts.push({ v: cy - halfWidth, pairId: `w${bIdx}`, trueLen: bldg.W });
            wPts.push({ v: cy + halfWidth, pairId: `w${bIdx}`, trueLen: bldg.W });

            // Depth chain: tag each copy — label shows perpendicular D, not bbox projection
            for (let j = 0; j < count; j++) {
                const cx = baseCx + (j - aOff) * step;
                dPts.push({ v: cx - halfDepth, pairId: `d${bIdx}_${j}`, trueLen: bldg.D });
                dPts.push({ v: cx + halfDepth, pairId: `d${bIdx}_${j}`, trueLen: bldg.D });
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

            // Dim segments between adjacent boundaries — with merge support
            // Build merged runs: consecutive segments in mergedDimKeys are combined
            var segRuns = [];
            for (let i = 0; i < chain.length - 1; i++) {
                const dimKey = prefix + '_' + i;
                if (MapEngine.hiddenDimKeys.has(dimKey)) continue;
                if (MapEngine.mergedDimKeys.has(dimKey) && segRuns.length > 0) {
                    segRuns[segRuns.length - 1].endIdx = i + 1;
                    segRuns[segRuns.length - 1].keys.push(dimKey);
                } else {
                    segRuns.push({ startIdx: i, endIdx: i + 1, keys: [dimKey] });
                }
            }

            // Witness lines — only at run endpoints (start/end of each merged run), not internal merge points
            var witnessIndices = new Set();
            segRuns.forEach(run => { witnessIndices.add(run.startIdx); witnessIndices.add(run.endIdx); });
            witnessIndices.forEach(j => {
                if (j < 0 || j >= chain.length) return;
                const p = isX ? { x: chain[j].v, y: refCoord } : { x: refCoord, y: chain[j].v };
                const l = push(L.polyline([toLatLng(p), toLatLng({ x: p.x + (EXT+EX2)*perpX, y: p.y + (EXT+EX2)*perpY })], dimStyle).addTo(MapEngine.map));
                chainLayers.push(l);
            });

            for (let ri = 0; ri < segRuns.length; ri++) {
                const run = segRuns[ri];
                const v1 = chain[run.startIdx].v, v2 = chain[run.endIdx].v;
                const dist = Math.abs(v2 - v1);
                if (dist < 0.5) continue;

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

                // Dim line split around label — clamp gap to 30% of segment so dims stay visible when zoomed out
                const segGap = Math.min(TO, dist * 0.3);
                pLine([d1, { x: mid.x - segGap*ux, y: mid.y - segGap*uy }]);
                pLine([{ x: mid.x + segGap*ux, y: mid.y + segGap*uy }, d2]);
                // Ticks
                pLine([{ x: d1.x - tk45x, y: d1.y - tk45y }, { x: d1.x + tk45x, y: d1.y + tk45y }]);
                pLine([{ x: d2.x - tk45x, y: d2.y - tk45y }, { x: d2.x + tk45x, y: d2.y + tk45y }]);
                // Label — use true perpendicular W/D when segment spans exactly one building face;
                // otherwise fall back to axis-aligned dist (setback gaps, lot edges)
                const isMerged = run.keys.length > 1;
                const startPt = chain[run.startIdx], endPt = chain[run.endIdx];
                const isBldgFace = !isMerged && startPt.pairId && endPt.pairId
                    && startPt.pairId === endPt.pairId;
                const labelDist = isBldgFace ? startPt.trueLen : dist;
                const labelText = labelDist.toFixed(1) + "'" + (isMerged ? ' \u2194' : '');
                const m = push(L.marker(toLatLng(mid), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="dim-label' + (isMerged ? ' dim-merged' : '') + '" style="font-size:' + bldgFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + rotDeg + 'deg)">' + labelText + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: true
                }).addTo(MapEngine.map));
                layers.push(m); chainLayers.push(m);
                m.on('click', () => {
                    if (MapEngine.dimMergeMode) {
                        // In merge mode: toggle merge on the first key of this run
                        const firstKey = run.keys[0];
                        if (run.keys.length > 1) {
                            // Already merged — unmerge all
                            run.keys.forEach(k => MapEngine.mergedDimKeys.delete(k));
                        } else {
                            // Merge this segment into previous (mark it as merged)
                            MapEngine.mergedDimKeys.add(firstKey);
                        }
                        ExportEngine.save();
                        SetbackEngine.updateBldgDimLabels();
                    } else {
                        // Normal mode: hide
                        run.keys.forEach(k => MapEngine.hiddenDimKeys.add(k));
                        ExportEngine.save();
                        SetbackEngine.updateBldgDimLabels();
                    }
                });
            }
            return chainLayers;
        };

        // ── For polygon sites, tighten boundary to actual polygon edge at chain position ──
        if (polyLocalVerts && chainRefX != null) {
            var wExt = polyExtentAt(chainRefX, true);  // Y extent at X=wRef
            if (wExt) {
                wChain[0].v = wExt.min;
                wChain[wChain.length - 1].v = wExt.max;
            }
        }
        if (polyLocalVerts && chainRefY != null) {
            var dExt = polyExtentAt(chainRefY, false);  // X extent at Y=dRef
            if (dExt) {
                dChain[0].v = dExt.min;
                dChain[dChain.length - 1].v = dExt.max;
            }
        }

        // ── Draw the two chain dims ──────────────────────────────────────
        // Perpendicular flips outward: if chain is on the rear/right half, push further out
        // Clamp chain dim reference lines to lot bounds + self-heal stale offsets
        const wRefRaw = chainRefX + MapEngine.chainWOffset;
        const dRefRaw = chainRefY + MapEngine.chainDOffset;
        const wRef = Math.max(-lotHD, Math.min(lotHD, wRefRaw));
        const dRef = Math.max(-lotHW, Math.min(lotHW, dRefRaw));
        if (wRef !== wRefRaw) MapEngine.chainWOffset = wRef - chainRefX;
        if (dRef !== dRefRaw) MapEngine.chainDOffset = dRef - chainRefY;
        const wPerpX = wRef > 0 ? 1 : -1;
        const dPerpY = dRef > 0 ? 1 : -1;
        let wLayers = drawChain(wChain, wRef, false, wPerpX, 0, clrWidthAngle, 'chain_w');
        let dLayers = drawChain(dChain, dRef, true, 0, dPerpY, clrDepthAngle, 'chain_d');

        // ── Drag-to-reposition via chain lines ──────────────────────────
        const toLocal = ll => MapEngine.toLocal(ll, state);

        // Snap anchors: lot edges + all building boundaries
        const wAnchors = [-lotHD, lotHD];
        const dAnchors = [-lotHW, lotHW];
        state.buildings.forEach((bldg) => {
            const { halfDepth, halfWidth } = this.buildingExtents(bldg);
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

        // Threshold snap: only snap when within CHAIN_SNAP_THRESH ft of an anchor.
        // Always hard-clamps to [minBound, maxBound] so chain stays inside lot.
        const CHAIN_SNAP_THRESH = 4;
        const snapTo = (val, anchors, minBound, maxBound) => {
            const bounded = Math.max(minBound, Math.min(maxBound, val));
            let best = null, bestD = CHAIN_SNAP_THRESH;
            for (let i = 0; i < anchors.length; i++) {
                const d = Math.abs(bounded - anchors[i]);
                if (d < bestD) { best = anchors[i]; bestD = d; }
            }
            return best !== null ? best : bounded;
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
                        const snapped = snapTo(rawVal, anchors, isX ? -lotHW : -lotHD, isX ? lotHW : lotHD);
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
                        ExportEngine.save();
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
                    const snapped = snapTo(rawVal, anchors, isX ? -lotHW : -lotHD, isX ? lotHW : lotHD);
                    if (MapEngine[offsetProp] === snapped - baseRef) return;
                    MapEngine[offsetProp] = snapped - baseRef;
                    const newRef = baseRef + MapEngine[offsetProp];
                    getLayers().forEach(ll => MapEngine.map.removeLayer(ll));
                    setLayers(drawChain(chain, newRef, isX, isX ? perpX : (newRef > 0 ? 1 : -1), isX ? (newRef > 0 ? 1 : -1) : perpY, rotDeg, prefix));
                    handle.setLatLng(toLatLng(getHPt()));
                });
                handle.on('dragend', () => { ExportEngine.save(); });
            };
            autoHandle(wChain, false, wPerpX, 0, 'chainWOffset', chainRefX, wAnchors, clrWidthAngle, 'chain_w', () => wLayers, (l) => { wLayers = l; });
            autoHandle(dChain, true,  0, dPerpY, 'chainDOffset', chainRefY, dAnchors, clrDepthAngle, 'chain_d', () => dLayers, (l) => { dLayers = l; });
        }
    },

    updateFAR: function() {
        const state   = ConfigEngine.state;
        const { width: lotW, depth: lotD, lotSF } = ConfigEngine.data;
        const lotArea = (lotSF && lotSF > 0) ? lotSF : (lotW * lotD);
        if (!lotArea) return;

        const sd        = window.__SITE_DEFAULTS__ || {};
        const commFront = state.commFront || false;
        const maxFAR    = commFront ? (sd.commFAR ?? 6.5) : (sd.baseFAR ?? 2.0);
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

        const chkEl = document.getElementById('bldgFARCheck');
        if (maxFAR > 0) {
            set('bldgFAR',       actualFAR.toFixed(2));
            set('bldgBuildable', 'MAX ' + buildable.toLocaleString() + ' sf');
            set('maxFARLabel',   commFront ? 'Comm. Front: ' + maxFAR + ' FAR' : 'Base: ' + maxFAR + ' FAR');
            if (chkEl) {
                const ok = actualFAR <= maxFAR + 0.005;
                chkEl.textContent = ok
                    ? '\u2713 Within limit (' + actualFAR.toFixed(2) + ' \u2264 ' + maxFAR + ')'
                    : '\u2717 Exceeds limit (' + actualFAR.toFixed(2) + ' > ' + maxFAR + ')';
                chkEl.style.color = ok ? '#2f855a' : '#c53030';
            }
        } else {
            // FAR not applicable for this zone (baseFAR=0) — show actual but no limit
            set('bldgFAR',       actualFAR.toFixed(2));
            set('bldgBuildable', 'No FAR limit');
            set('maxFARLabel',   'FAR: No limit');
            if (chkEl) { chkEl.textContent = '\u2713 No FAR limit for this zone'; chkEl.style.color = '#2f855a'; }
        }

        const floorH      = active.floorHeight || 9;
        const activeStories = active.stories || 1;
        const totalHeight = activeStories * floorH + Math.max(0, activeStories - 1) * 1;
        set('bldgTotalHeight', totalHeight.toFixed(0));

        // Density check: total residential units vs base zone max
        const densPerSF = sd.densityPerSF ?? 600;
        const resiU     = state.buildings.reduce((s, b) => s + (b.stories || 1) * (b.count || 1), 0);
        const densEl    = document.getElementById('bldgDensity');
        const densChk   = document.getElementById('bldgDensityCheck');
        if (densPerSF > 0) {
            const baseDMax  = Math.floor(lotArea / densPerSF);
            const sdbMin    = baseDMax + Math.ceil(baseDMax * 0.225); // 5% LI -> 22.5% bonus
            if (densEl)  densEl.textContent  = resiU + ' DU / ' + (commFront ? 'unlimited' : baseDMax + ' max');
            if (densChk) {
                if (commFront)             { densChk.textContent = '\u2713 CCHS: no limit'; densChk.style.color = '#2f855a'; }
                else if (resiU <= baseDMax) { densChk.textContent = '\u2713 Within base zone'; densChk.style.color = '#2f855a'; }
                else if (resiU <= sdbMin)   { densChk.textContent = '\u26a0 Needs SDB (min 5% aff)'; densChk.style.color = '#d97706'; }
                else                        { densChk.textContent = '\u2717 Exceeds base -- use CCHS or SDB'; densChk.style.color = '#c53030'; }
            }
        } else {
            // densityPerSF=0 means density not governed by lot-area formula (e.g. R-3 MDR)
            if (densEl)  densEl.textContent  = resiU + ' DU / per zoning';
            if (densChk) { densChk.textContent = '\u2713 Density per zoning overlay'; densChk.style.color = '#2f855a'; }
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
            v = ((v % 360) + 360) % 360;
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
                // Clamp typed values to lot boundary
                const { front: _f, rear: _r, sideL: _sl, sideR: _sr } = state.setbacks;
                const _cl = this.clampToLot(bldg.offsetX + (_f-_r)/2, bldg.offsetY + (_sr-_sl)/2, bldg);
                bldg.offsetX = parseFloat((_cl.cx - (_f-_r)/2).toFixed(1));
                bldg.offsetY = parseFloat((_cl.cy - (_sr-_sl)/2).toFixed(1));
                document.getElementById('bldgOffsetX').value = bldg.offsetX.toFixed(1);
                document.getElementById('bldgOffsetY').value = bldg.offsetY.toFixed(1);
                if (idx > 0) {
                    const gap = this._computeGap(idx);
                    bldg.spacing = gap !== null ? gap : 0;
                    const spEl = document.getElementById('bldgSpacing');
                    if (spEl) spEl.value = bldg.spacing.toFixed(1);
                }
                this.drawBuilding();
                ExportEngine.save();
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
            const ext  = this.buildingExtents(bldg);
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
            const ext   = this.buildingExtents(bldg);
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

        // Stack angle input
        document.getElementById('bldgStackAngle').addEventListener('change', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            let a = parseFloat(document.getElementById('bldgStackAngle').value) || 0;
            a = ((a % 360) + 360) % 360;
            document.getElementById('bldgStackAngle').value = a;
            const sliderEl = document.getElementById('bldgStackAngleSlider');
            if (sliderEl) sliderEl.value = a;
            bldg.stackAngle = a;
            const dirBtn = document.getElementById('bldgStackDirBtn');
            if (dirBtn) dirBtn.textContent = a < 1 ? '→' : Math.abs(a - 90) < 1 ? '↑' : Math.abs(a - 180) < 1 ? '←' : Math.abs(a - 270) < 1 ? '↓' : '∠';
            this.drawBuilding();
            ExportEngine.save();
        });

        // Stack direction toggle: cycles → (0°) → ↑ (90°) → ← (180°) → ↓ (270°)
        document.getElementById('bldgStackDirBtn').addEventListener('click', () => {
            const bldg = state.buildings[state.activeBuilding];
            if (!bldg) return;
            const steps = [0, 90, 180, 270];
            const dirs  = ['→', '↑', '←', '↓'];
            const cur   = bldg.stackAngle || 0;
            const idx   = steps.findIndex(s => Math.abs(cur - s) < 1);
            const next  = steps[(idx < 0 ? 0 : idx + 1) % 4];
            bldg.stackAngle = next;
            document.getElementById('bldgStackAngle').value = next;
            const sliderEl = document.getElementById('bldgStackAngleSlider');
            if (sliderEl) sliderEl.value = next;
            document.getElementById('bldgStackDirBtn').textContent = dirs[steps.indexOf(next)];
            this.drawBuilding();
            ExportEngine.save();
        });

        // Stack angle slider
        const stackAngleSlider = document.getElementById('bldgStackAngleSlider');
        if (stackAngleSlider) {
            stackAngleSlider.addEventListener('input', () => {
                const bldg = state.buildings[state.activeBuilding];
                if (!bldg) return;
                const a = parseInt(stackAngleSlider.value, 10);
                bldg.stackAngle = a;
                document.getElementById('bldgStackAngle').value = a;
                const dirBtn = document.getElementById('bldgStackDirBtn');
                if (dirBtn) dirBtn.textContent = a < 1 ? '→' : Math.abs(a - 90) < 1 ? '↑' : Math.abs(a - 180) < 1 ? '←' : Math.abs(a - 270) < 1 ? '↓' : '∠';
                this.drawBuilding();
            });
            stackAngleSlider.addEventListener('change', () => { ExportEngine.save(); });
        }

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
            // Reset hidden + merged dims when toggling — fresh slate each toggle cycle
            MapEngine.hiddenDimKeys.clear();
            MapEngine.mergedDimKeys.clear();
            const btn = document.getElementById('bldgDimBtn');
            btn.classList.toggle('active', on);
            btn.textContent = on ? 'Hide Dims' : 'Show Dims';
            this.updateBldgDimLabels();
            MapEngine.updateDimLabels();
        });

        // Restore dim toggle + hidden keys from saved config
        // Lot boundary dims (red) always show; building chain dims follow saved toggle
        const dimsOn = state.showBldgDims || false;
        MapEngine.showBldgDims = dimsOn;
        MapEngine.showDims     = true;
        if (state.hiddenDimKeys) state.hiddenDimKeys.forEach(k => MapEngine.hiddenDimKeys.add(k));
        if (state.mergedDimKeys) state.mergedDimKeys.forEach(k => MapEngine.mergedDimKeys.add(k));
        if (state.chainWOffset != null) MapEngine.chainWOffset = state.chainWOffset;
        if (state.chainDOffset != null) MapEngine.chainDOffset = state.chainDOffset;
        if (state.propDimOffsets) MapEngine._propDimOffsets = state.propDimOffsets;
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
        const { width: w, depth: h, parcelPolygon: pp } = ConfigEngine.data;

        const rad   = ConfigEngine.state.rotation * Math.PI / 180;
        const cos   = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const transform = (pt) => {
            let rx = pt.x * cos - pt.y * sin;
            let ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        var setbackPts;

        if (pp && pp.length > 2) {
            // Polygon mode: inset each edge by its setback based on orientation
            var n = pp.length;
            if (pp[n-1][0]===pp[0][0] && pp[n-1][1]===pp[0][1]) n--;
            var cLat = 0, cLng = 0;
            for (var i = 0; i < n; i++) { cLat += pp[i][0]; cLng += pp[i][1]; }
            cLat /= n; cLng /= n;
            // Convert to local coords
            var lv = [];
            for (var i = 0; i < n; i++) {
                var ry = (pp[i][0] - cLat) * F_LAT;
                var rx = (pp[i][1] - cLng) * F_LNG;
                lv.push({ x: rx * cos + ry * sin, y: ry * cos - rx * sin });
            }
            // Signed area for winding
            var sa = 0;
            for (var i = 0; i < n; i++) { var j=(i+1)%n; sa += lv[i].x*lv[j].y - lv[j].x*lv[i].y; }
            var ws = sa > 0 ? 1 : -1;
            // For each edge: compute outward normal, assign setback, offset inward
            var offEdges = [];
            for (var i = 0; i < n; i++) {
                var j = (i+1) % n;
                var dx = lv[j].x - lv[i].x, dy = lv[j].y - lv[i].y;
                var len = Math.sqrt(dx*dx + dy*dy);
                if (len < 0.1) continue;
                var ux = dx/len, uy = dy/len;
                var nx = uy * ws, ny = -ux * ws;  // outward normal
                // Assign setback: front (-X facing), rear (+X), sideL (-Y), sideR (+Y)
                var sb;
                if (Math.abs(nx) > Math.abs(ny)) sb = nx < 0 ? front : rear;
                else sb = ny < 0 ? sideL : sideR;
                // Offset edge inward (opposite of outward normal)
                offEdges.push({
                    p1: { x: lv[i].x - sb*nx, y: lv[i].y - sb*ny },
                    p2: { x: lv[j].x - sb*nx, y: lv[j].y - sb*ny },
                    dx: dx, dy: dy
                });
            }
            // Intersect consecutive offset edges to get inset vertices
            setbackPts = [];
            for (var i = 0; i < offEdges.length; i++) {
                var j = (i+1) % offEdges.length;
                var a = offEdges[i], b = offEdges[j];
                // Line-line intersection: a.p1 + t*(a.dx,a.dy) = b.p1 + s*(b.dx,b.dy)
                var det = a.dx * b.dy - a.dy * b.dx;
                if (Math.abs(det) < 0.001) { setbackPts.push(a.p2); continue; }
                var t = ((b.p1.x - a.p1.x) * b.dy - (b.p1.y - a.p1.y) * b.dx) / det;
                setbackPts.push({ x: a.p1.x + t * a.dx, y: a.p1.y + t * a.dy });
            }
        } else {
            // Rectangle mode
            setbackPts = [
                { x: -h/2 + front, y:  w/2 - sideR },
                { x:  h/2 - rear,  y:  w/2 - sideR },
                { x:  h/2 - rear,  y: -w/2 + sideL },
                { x: -h/2 + front, y: -w/2 + sideL }
            ];
        }

        MapEngine.setbackPoly.setLatLngs(setbackPts.map(transform));

        // Clear old setback dim labels
        MapEngine.setbackDimLabels.forEach(function(l) { MapEngine.map.removeLayer(l); });
        MapEngine.setbackDimLabels = [];

        // Draw setback dim labels for rectangle sites
        if (!(pp && pp.length > 2)) {
            var mapZoom = MapEngine.map.getZoom();
            var sbFontScale = Math.max(0.78, 0.36 + mapZoom * 0.025);
            var sbStyle = { color: '#d97706', weight: 1.5, dashArray: '4 3', interactive: false, noClip: true };
            var sides = [
                { label: 'F', dist: front, bx: -h/2,         by: 0, sx: -h/2 + front, sy: 0, perpX: 0, perpY: 1 },
                { label: 'R', dist: rear,  bx:  h/2,         by: 0, sx:  h/2 - rear,  sy: 0, perpX: 0, perpY: 1 },
                { label: 'SL', dist: sideL, bx: 0, by: -w/2,         sx: 0, sy: -w/2 + sideL, perpX: 1, perpY: 0 },
                { label: 'SR', dist: sideR, bx: 0, by:  w/2,         sx: 0, sy:  w/2 - sideR, perpX: 1, perpY: 0 }
            ];
            sides.forEach(function(s) {
                if (s.dist < 0.5) return;
                // Dim line from boundary midpoint to setback midpoint
                var dimLine = L.polyline(
                    [transform({x: s.bx, y: s.by}), transform({x: s.sx, y: s.sy})],
                    sbStyle
                ).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(dimLine);
                // Label at midpoint
                var labelPt = { x: (s.bx + s.sx) / 2, y: (s.by + s.sy) / 2 };
                // Rotation: perpendicular to lot edge
                var scrX = s.perpX * cos - s.perpY * sin;
                var scrY = s.perpX * sin + s.perpY * cos;
                var lblAngle = -Math.atan2(scrY, scrX) * 180 / Math.PI;
                lblAngle = ((lblAngle % 180) + 180) % 180;
                if (lblAngle >= 90) lblAngle -= 180;
                var m = L.marker(transform(labelPt), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="setback-dim-label" style="font-size:' + sbFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + lblAngle.toFixed(1) + 'deg)">' + s.dist.toFixed(0) + "'" + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: false
                }).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(m);
            });
        }

        // Draw setback-to-boundary dim lines + labels for polygon sites
        // Only one label per side (front/rear/sideL/sideR) — placed on the longest edge of that type
        if (pp && pp.length > 2 && offEdges && offEdges.length > 0) {
            var mapZoom = MapEngine.map.getZoom();
            var sbFontScale = Math.max(0.78, 0.36 + mapZoom * 0.025);
            // Find longest edge per side for label placement
            var bestEdge = {};  // key: 'front'|'rear'|'sideL'|'sideR' → {ei, len}
            for (var ei = 0; ei < offEdges.length; ei++) {
                var oe = offEdges[ei];
                var edgeLen = Math.sqrt(oe.dx*oe.dx + oe.dy*oe.dy);
                if (edgeLen < 1) continue;
                var eUx_ = oe.dx/edgeLen, eUy_ = oe.dy/edgeLen;
                var eNx_ = eUy_ * ws, eNy_ = -eUx_ * ws;
                var side = Math.abs(eNx_) > Math.abs(eNy_) ? (eNx_ < 0 ? 'front' : 'rear') : (eNy_ < 0 ? 'sideL' : 'sideR');
                if (!bestEdge[side] || edgeLen > bestEdge[side].len) bestEdge[side] = { ei: ei, len: edgeLen };
            }
            for (var ei = 0; ei < offEdges.length; ei++) {
                var oe = offEdges[ei];
                var edgeLen = Math.sqrt(oe.dx*oe.dx + oe.dy*oe.dy);
                if (edgeLen < 1) continue;
                var eUx = oe.dx/edgeLen, eUy = oe.dy/edgeLen;
                var eNx = eUy * ws, eNy = -eUx * ws;
                var side = Math.abs(eNx) > Math.abs(eNy) ? (eNx < 0 ? 'front' : 'rear') : (eNy < 0 ? 'sideL' : 'sideR');
                var sbDist = Math.abs(eNx) > Math.abs(eNy)
                    ? (eNx < 0 ? front : rear)
                    : (eNy < 0 ? sideL : sideR);
                if (sbDist < 0.5) continue;
                var showLabel = bestEdge[side] && bestEdge[side].ei === ei;
                // Midpoint of boundary edge
                var origIdx = ei < n ? ei : 0;
                var nextIdx = (origIdx + 1) % n;
                var bMidX = (lv[origIdx].x + lv[nextIdx].x) / 2;
                var bMidY = (lv[origIdx].y + lv[nextIdx].y) / 2;
                // Setback midpoint (inward by setback distance)
                var sMidX = bMidX - eNx * sbDist;
                var sMidY = bMidY - eNy * sbDist;
                // Simple dim line from boundary midpoint to setback midpoint
                var sbStyle = { color: '#d97706', weight: 2, interactive: false, noClip: true };
                var dimLine = L.polyline(
                    [transform({x: bMidX, y: bMidY}), transform({x: sMidX, y: sMidY})],
                    sbStyle
                ).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(dimLine);
                // Label only on longest edge per side (no stacking)
                if (!showLabel) continue;
                var labelX = (bMidX + sMidX) / 2;
                var labelY = (bMidY + sMidY) / 2;
                var scrNx = -eNx * cos - (-eNy) * sin;
                var scrNy = -eNx * sin + (-eNy) * cos;
                var lblAngle = -Math.atan2(scrNy, scrNx) * 180 / Math.PI;
                lblAngle = ((lblAngle % 180) + 180) % 180;
                if (lblAngle >= 90) lblAngle -= 180;
                var m = L.marker(transform({ x: labelX, y: labelY }), {
                    icon: L.divIcon({
                        className: '',
                        html: '<div style="position:relative"><div class="setback-dim-label" style="font-size:' + sbFontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + lblAngle.toFixed(1) + 'deg)">' + sbDist.toFixed(0) + "'" + '</div></div>',
                        iconSize: [0, 0], iconAnchor: [0, 0]
                    }),
                    interactive: false
                }).addTo(MapEngine.map);
                MapEngine.setbackDimLabels.push(m);
            }
        }
    }
};

