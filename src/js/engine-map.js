/* ==========================================
   ENGINE 3: MAP & GEOMETRY
   ========================================== */
const MapEngine = {
    map: null, dragMarker: null, lotPoly: null, commPoly: null,
    gridLayer: null, setbackPoly: null, buildingPolys: [], buildingMarkers: [],
    dimLabels: [], showDims: false,
    bldgDimLabels: [], showBldgDims: false,
    hiddenDimKeys: new Set(),  // persists across redraws; cleared on dim toggle
    chainWOffset: 0, chainDOffset: 0,  // perpendicular offsets for chain dim repositioning
    _isDragging: false,        // true during any drag — suppresses dim rebuild and save
    _saveTimer:  null,         // debounce handle for ExportEngine.save()
    dimDragMode: false,        // when true, clicking dim lines activates drag handle
    // Vehicle overlay
    vehiclePolys: [], vehicleMarkers: [], vehicleLabels: [],
    VEHICLE_TYPES: {
        sedan:    { label: 'Sedan',       W: 6,   D: 15,   color: '#3b82f6' },
        suv:      { label: 'SUV',         W: 6.5, D: 17,   color: '#3b82f6' },
        pickup:   { label: 'Pickup',      W: 6.5, D: 20,   color: '#3b82f6' },
        van:      { label: 'Van',         W: 7,   D: 18,   color: '#3b82f6' },
        firetruck:{ label: 'Fire Truck',  W: 8.5, D: 35,   color: '#dc2626' },
        bus:      { label: 'Bus',         W: 8.5, D: 40,   color: '#f59e0b' },
        compact:  { label: 'Compact',     W: 5.5, D: 13.5, color: '#3b82f6' },
        trash:    { label: 'Trash Truck', W: 8,   D: 28,   color: '#65a30d' }
    },

    init: function() {
        const street    = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true, attribution: 'Esri' });
        const sat       = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',    { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true, attribution: 'Esri' });
        const topoEsri  = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',   { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true, attribution: 'Esri' });
        const topoUSGS  = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}',         { maxNativeZoom: 16, maxZoom: 23, crossOrigin: true, attribution: 'USGS' });

        this.map = L.map('map', {
            center: [ConfigEngine.state.lat, ConfigEngine.state.lng],
            zoom: 19, maxZoom: 23, layers: [sat],
            fullscreenControl: true, fullscreenControlOptions: { position: 'topleft' }
        });
        L.control.layers({ "Satellite": sat, "Street Map": street, "Topo (Esri)": topoEsri, "Topo (USGS)": topoUSGS }).addTo(this.map);

        const GridOverlay = L.GridLayer.extend({
            createTile: function() {
                var t = L.DomUtil.create('canvas', 'leaflet-tile');
                var s = this.getTileSize();
                t.width = s.x; t.height = s.y;
                var ctx = t.getContext('2d');
                ctx.strokeStyle = 'rgba(15,76,129,0.15)';
                ctx.strokeRect(0, 0, s.x, s.y);
                return t;
            }
        });
        this.gridLayer = new GridOverlay();

        this.buildNorthArrow();
        this.buildHelpControl();
        this.buildDimDragToggle();
        this._baseLayers = { "Satellite": sat, "Street Map": street, "Topo (Esri)": topoEsri, "Topo (USGS)": topoUSGS };
        this._activeBase = sat;
        this.map.on('baselayerchange', (e) => { this._activeBase = e.layer; e.layer.setOpacity(ConfigEngine.state.mapOpacity / 100); });
        this.buildOpacityPanel();

        this.lotPoly     = L.polygon([], { color: '#d9381e', weight: 3, fillOpacity: 0, noClip: true }).addTo(this.map);
        this.commPoly    = L.polygon([], { color: '#0f4c81', weight: 1, fillColor: '#0f4c81', fillOpacity: 0.3, noClip: true }).addTo(this.map);
        this.setbackPoly = L.polygon([], { color: '#f6c90e', weight: 2, fillOpacity: 0,   dashArray: '7 4', noClip: true }).addTo(this.map);
        this.dragMarker  = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], { draggable: true }).addTo(this.map);

        this.attachEvents();
        this.render();

        // If we have a GIS parcel polygon, fit map to its bounds
        if (ConfigEngine.data.parcelPolygon && ConfigEngine.data.parcelPolygon.length > 2) {
            this.map.fitBounds(this.lotPoly.getBounds(), { padding: [40, 40] });
        }

        L.Util.requestAnimFrame(() => this.map.invalidateSize());
    },

    createBuildingMarker: function(idx) {
        const m = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], {
            draggable: true,
            icon: L.divIcon({
                className: '',
                html: '<div class="bldg-drag-pin">' + (idx + 1) + '</div>',
                iconAnchor: [9, 9]
            })
        }).addTo(this.map);

        m.on('dragstart', () => { this._isDragging = true; });
        m.on('drag', () => {
            const raw   = m.getLatLng();
            const state = ConfigEngine.state;
            const bldg  = state.buildings[idx];
            if (!bldg) return;
            const F_LAT = 364566;
            const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
            const ry    = (raw.lat - state.lat) * F_LAT;
            const rx    = (raw.lng - state.lng) * F_LNG;
            const rad   = state.rotation * Math.PI / 180;
            const cos   = Math.cos(rad), sin = Math.sin(rad);
            const lx    = rx * cos + ry * sin;
            const ly    = -rx * sin + ry * cos;
            const { front, rear, sideL, sideR } = state.setbacks;
            let newOffsetX = parseFloat((lx - (front - rear) / 2).toFixed(1));
            bldg.offsetY   = parseFloat((ly - (sideR - sideL) / 2).toFixed(1));
            // Enforce non-overlap: cannot drag past previous building (min gap = 0)
            // Skip if free drag mode is active
            if (idx > 0 && !state.freeDrag) {
                const prev       = state.buildings[idx - 1];
                const prevExt    = SetbackEngine._buildingExtents(prev);
                const thisExt    = SetbackEngine._buildingExtents(bldg);
                const minOffsetX = prev.offsetX + prevExt.halfDepth + thisExt.halfDepth;
                newOffsetX       = Math.max(minOffsetX, newOffsetX);
                bldg.spacing     = parseFloat((newOffsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
            }
            bldg.offsetX = newOffsetX;
            // Always clamp to lot boundary — buildings cannot leave the lot
            if (typeof SetbackEngine._clampToLot === 'function') {
                const { front: f, rear: r, sideL: sl, sideR: sr } = state.setbacks;
                const clamped = SetbackEngine._clampToLot(
                    bldg.offsetX + (f - r) / 2,
                    bldg.offsetY + (sr - sl) / 2,
                    bldg
                );
                bldg.offsetX = parseFloat((clamped.cx - (f - r) / 2).toFixed(1));
                bldg.offsetY = parseFloat((clamped.cy - (sr - sl) / 2).toFixed(1));
            }
            // Apply snap-to-edge if enabled
            if (state.snapEdge) {
                const snapped = this._applySnap(idx, bldg.offsetX, bldg.offsetY);
                bldg.offsetX = snapped.x;
                bldg.offsetY = snapped.y;
            }
            if (state.activeBuilding === idx) {
                const ox   = document.getElementById('bldgOffsetX');
                const oy   = document.getElementById('bldgOffsetY');
                const spEl = document.getElementById('bldgSpacing');
                if (ox)   ox.value   = bldg.offsetX.toFixed(1);
                if (oy)   oy.value   = bldg.offsetY.toFixed(1);
                if (spEl && idx > 0) spEl.value = bldg.spacing.toFixed(1);
            }
            SetbackEngine.drawBuilding(true);
        });
        m.on('dragend', () => {
            this._isDragging = false;
            SetbackEngine.drawBuilding();
            ExportEngine.save();
        });
        return m;
    },

    // ── Free Drag & Snap ──────────────────────────────────────────────────
    toggleFreeDrag: function() {
        const state = ConfigEngine.state;
        state.freeDrag = !state.freeDrag;
        const btn = document.getElementById('freeDragBtn');
        if (state.freeDrag) {
            btn.style.background = '#d97706'; btn.style.color = '#fff';
            btn.textContent = 'Free Drag ON';
        } else {
            btn.style.background = ''; btn.style.color = '';
            btn.textContent = 'Free Drag';
        }
    },

    toggleSnapEdge: function() {
        const state = ConfigEngine.state;
        state.snapEdge = !state.snapEdge;
        const btn = document.getElementById('snapEdgeBtn');
        if (state.snapEdge) {
            btn.style.background = '#e11d48'; btn.style.color = '#fff';
            btn.textContent = 'Snap ON';
        } else {
            btn.style.background = ''; btn.style.color = '';
            btn.textContent = 'Snap Edge';
        }
    },

    _applySnap: function(idx, offsetX, offsetY) {
        const state = ConfigEngine.state;
        const bldg = state.buildings[idx];
        const THRESHOLD = 8; // snap within 8 feet
        const thisExt = SetbackEngine._buildingExtents(bldg);
        let snappedX = offsetX, snappedY = offsetY;
        let bestDistY = THRESHOLD, bestDistX = THRESHOLD;

        // This building's edges
        const thisTop    = offsetY + thisExt.halfWidth;
        const thisBot    = offsetY - thisExt.halfWidth;
        const thisRight  = offsetX + thisExt.halfDepth;
        const thisLeft   = offsetX - thisExt.halfDepth;

        // Snap to lot boundary edges
        const { front, rear, sideL, sideR } = state.setbacks;
        const lotW = ConfigEngine.data.width;
        const lotD = ConfigEngine.data.depth;
        const lotHalfD = lotD / 2;
        const lotHalfW = lotW / 2;
        // Lot edges in offset coordinates (relative to lot center)
        const lotFront  = lotHalfD - front;    // front edge (max X)
        const lotRear   = -lotHalfD + rear;    // rear edge (min X)
        const lotLeft   = lotHalfW - sideL;    // left edge (max Y)
        const lotRight  = -lotHalfW + sideR;   // right edge (min Y)

        // Snap building edges to lot boundary edges
        const lotYSnaps = [
            { from: thisTop, to: lotLeft,  adj: lotLeft - thisExt.halfWidth },
            { from: thisBot, to: lotRight, adj: lotRight + thisExt.halfWidth },
            { from: thisTop, to: lotRight, adj: lotRight + thisExt.halfWidth },
            { from: thisBot, to: lotLeft,  adj: lotLeft - thisExt.halfWidth },
        ];
        for (const s of lotYSnaps) {
            const d = Math.abs(s.from - s.to);
            if (d < bestDistY) { bestDistY = d; snappedY = s.adj; }
        }
        const lotXSnaps = [
            { from: thisRight, to: lotFront, adj: lotFront - thisExt.halfDepth },
            { from: thisLeft,  to: lotRear,  adj: lotRear + thisExt.halfDepth },
            { from: thisLeft,  to: lotFront, adj: lotFront - thisExt.halfDepth },
            { from: thisRight, to: lotRear,  adj: lotRear + thisExt.halfDepth },
        ];
        for (const s of lotXSnaps) {
            const d = Math.abs(s.from - s.to);
            if (d < bestDistX) { bestDistX = d; snappedX = s.adj; }
        }

        // Snap to other buildings
        state.buildings.forEach((other, i) => {
            if (i === idx) return;
            const otherExt = SetbackEngine._buildingExtents(other);
            const oTop   = other.offsetY + otherExt.halfWidth;
            const oBot   = other.offsetY - otherExt.halfWidth;
            const oRight = other.offsetX + otherExt.halfDepth;
            const oLeft  = other.offsetX - otherExt.halfDepth;

            // Y snaps: edge-to-edge (wall touch), edge-to-edge (align), center
            const ySnaps = [
                { from: thisBot, to: oBot,   adj: oBot + thisExt.halfWidth },     // bottom-to-bottom
                { from: thisTop, to: oTop,   adj: oTop - thisExt.halfWidth },     // top-to-top
                { from: thisBot, to: oTop,   adj: oTop + thisExt.halfWidth },     // my bottom to their top (stack)
                { from: thisTop, to: oBot,   adj: oBot - thisExt.halfWidth },     // my top to their bottom (stack)
                { from: offsetY, to: other.offsetY, adj: other.offsetY },          // center align
            ];
            for (const s of ySnaps) {
                const d = Math.abs(s.from - s.to);
                if (d < bestDistY) { bestDistY = d; snappedY = s.adj; }
            }

            // X snaps: edge-to-edge, center
            const xSnaps = [
                { from: thisLeft,  to: oLeft,  adj: oLeft + thisExt.halfDepth },   // left-to-left
                { from: thisRight, to: oRight, adj: oRight - thisExt.halfDepth },  // right-to-right
                { from: thisLeft,  to: oRight, adj: oRight + thisExt.halfDepth },  // my left to their right (abut)
                { from: thisRight, to: oLeft,  adj: oLeft - thisExt.halfDepth },   // my right to their left (abut)
                { from: offsetX, to: other.offsetX, adj: other.offsetX },           // center align
            ];
            for (const s of xSnaps) {
                const d = Math.abs(s.from - s.to);
                if (d < bestDistX) { bestDistX = d; snappedX = s.adj; }
            }
        });
        return { x: parseFloat(snappedX.toFixed(1)), y: parseFloat(snappedY.toFixed(1)) };
    },

    // ── Vehicle Placement ─────────────────────────────────────────────────
    addVehicle: function() {
        const state = ConfigEngine.state;
        if (!state.vehicles) state.vehicles = [];
        state.vehicles.push({ type: 'sedan', offsetX: 0, offsetY: 0, orientation: 0 });
        state.activeVehicle = state.vehicles.length - 1;
        this.drawVehicles();
        this._rebuildVehicleTabs();
        this._seedVehicleInputs(state.activeVehicle);
        ExportEngine.save();
    },

    removeVehicle: function() {
        const state = ConfigEngine.state;
        if (!state.vehicles || state.vehicles.length === 0) return;
        const idx = state.activeVehicle || 0;
        // Remove marker + poly
        if (this.vehicleMarkers[idx]) { this.map.removeLayer(this.vehicleMarkers[idx]); }
        if (this.vehiclePolys[idx])   { this.map.removeLayer(this.vehiclePolys[idx]); }
        state.vehicles.splice(idx, 1);
        this.vehicleMarkers.splice(idx, 1);
        this.vehiclePolys.splice(idx, 1);
        state.activeVehicle = Math.min(idx, state.vehicles.length - 1);
        if (state.vehicles.length === 0) state.activeVehicle = -1;
        this.drawVehicles();
        this._rebuildVehicleTabs();
        if (state.vehicles.length > 0) this._seedVehicleInputs(state.activeVehicle);
        ExportEngine.save();
    },

    setActiveVehicle: function(idx) {
        ConfigEngine.state.activeVehicle = idx;
        this._rebuildVehicleTabs();
        this._seedVehicleInputs(idx);
    },

    _rebuildVehicleTabs: function() {
        const sel = document.getElementById('vehSelector');
        if (!sel) return;
        const vehicles = ConfigEngine.state.vehicles || [];
        [...sel.querySelectorAll('.veh-tab')].forEach(b => b.remove());
        const addBtn = sel.querySelector('.veh-tab-add');
        vehicles.forEach((_, i) => {
            const btn = document.createElement('button');
            btn.className = 'bldg-tab veh-tab' + (i === ConfigEngine.state.activeVehicle ? ' active' : '');
            btn.textContent = 'V' + (i + 1);
            btn.addEventListener('click', () => this.setActiveVehicle(i));
            sel.insertBefore(btn, addBtn);
        });
    },

    _seedVehicleInputs: function(idx) {
        const v = (ConfigEngine.state.vehicles || [])[idx];
        if (!v) return;
        const typeEl = document.getElementById('vehType');
        const oriEl  = document.getElementById('vehOrient');
        if (typeEl) typeEl.value = v.type;
        if (oriEl)  oriEl.value  = (v.orientation || 0).toFixed(1);
        // Update size display
        const spec = this.VEHICLE_TYPES[v.type] || this.VEHICLE_TYPES.sedan;
        const szEl = document.getElementById('vehSizeLabel');
        if (szEl) szEl.textContent = spec.W + "' x " + spec.D + "'";
    },

    createVehicleMarker: function(idx) {
        const m = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], {
            draggable: true,
            icon: L.divIcon({
                className: '',
                html: '<div class="veh-drag-pin">V' + (idx + 1) + '</div>',
                iconAnchor: [9, 9]
            })
        }).addTo(this.map);

        m.on('dragstart', () => { this._isDragging = true; });
        m.on('drag', () => {
            const raw   = m.getLatLng();
            const state = ConfigEngine.state;
            const veh   = state.vehicles[idx];
            if (!veh) return;
            const F_LAT = 364566;
            const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
            const ry    = (raw.lat - state.lat) * F_LAT;
            const rx    = (raw.lng - state.lng) * F_LNG;
            const rad   = state.rotation * Math.PI / 180;
            const cos   = Math.cos(rad), sin = Math.sin(rad);
            veh.offsetX = parseFloat((rx * cos + ry * sin).toFixed(1));
            veh.offsetY = parseFloat((-rx * sin + ry * cos).toFixed(1));
            this.drawVehicles();
        });
        m.on('dragend', () => {
            this._isDragging = false;
            this.drawVehicles();
            ExportEngine.save();
        });
        return m;
    },

    drawVehicles: function() {
        const state    = ConfigEngine.state;
        const vehicles = state.vehicles || [];
        const lRad = state.rotation * Math.PI / 180;
        const lCos = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const toLL = pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        };

        // Sync poly/marker arrays
        while (this.vehiclePolys.length < vehicles.length) {
            this.vehiclePolys.push(L.polygon([], { weight: 2, fillOpacity: 0.35, noClip: true }).addTo(this.map));
            this.vehicleMarkers.push(this.createVehicleMarker(this.vehiclePolys.length - 1));
        }
        while (this.vehiclePolys.length > vehicles.length) {
            this.map.removeLayer(this.vehiclePolys.pop());
            this.map.removeLayer(this.vehicleMarkers.pop());
        }

        // Remove old labels
        this.vehicleLabels.forEach(l => this.map.removeLayer(l));
        this.vehicleLabels = [];

        vehicles.forEach((veh, i) => {
            const spec = this.VEHICLE_TYPES[veh.type] || this.VEHICLE_TYPES.sedan;
            const hw = spec.W / 2, hh = spec.D / 2;
            const vRad = (veh.orientation || 0) * Math.PI / 180;
            const vCos = Math.cos(vRad), vSin = Math.sin(vRad);
            const cx = veh.offsetX || 0, cy = veh.offsetY || 0;

            const raw = [
                { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
                { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
            ];
            const oriented = raw.map(pt => {
                const dx = pt.x - cx, dy = pt.y - cy;
                return { x: cx + dx * vCos - dy * vSin, y: cy + dx * vSin + dy * vCos };
            });

            this.vehiclePolys[i].setLatLngs(oriented.map(toLL));
            this.vehiclePolys[i].setStyle({ color: spec.color, fillColor: spec.color });

            // Position the drag marker at vehicle center
            this.vehicleMarkers[i].setLatLng(toLL({ x: cx, y: cy }));

            // Label
            const lbl = L.marker(toLL({ x: cx, y: cy }), {
                icon: L.divIcon({
                    className: '',
                    html: '<div class="veh-label">' + spec.label + '</div>',
                    iconSize: [0, 0], iconAnchor: [0, -12]
                }),
                interactive: false
            }).addTo(this.map);
            this.vehicleLabels.push(lbl);
        });
    },

    buildNorthArrow: function() {
        const NorthControl = L.Control.extend({
            options: { position: 'bottomleft' },
            onAdd: function() {
                var div = L.DomUtil.create('div', 'north-compass-wrap');
                div.innerHTML =
                    '<svg id="compassSvg" width="94" height="125" viewBox="-50 -50 100 132" style="display:block">' +
                    // Background circles
                    '<circle r="48" fill="rgba(8,8,16,.72)" stroke="rgba(255,255,255,.30)" stroke-width="1.5"/>' +
                    '<circle r="41" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="1"/>' +
                    // 8-point compass rose — True North (fixed, white)
                    '<g id="compassRose">' +
                    '  <polygon points="0,-38 5,-6 0,-19 -5,-6"  fill="#ffffff"/>' +
                    '  <polygon points="0,38 5,6 0,19 -5,6"     fill="rgba(255,255,255,.28)" stroke="rgba(255,255,255,.50)" stroke-width="0.8"/>' +
                    '  <polygon points="38,0 6,5 19,0 6,-5"     fill="#ffffff"/>' +
                    '  <polygon points="-38,0 -6,5 -19,0 -6,-5" fill="#ffffff"/>' +
                    '  <g transform="rotate(45)">' +
                    '    <polygon points="0,-27 3,-5 0,-13 -3,-5" fill="rgba(255,255,255,.50)"/>' +
                    '    <polygon points="0,27 3,5 0,13 -3,5"    fill="rgba(255,255,255,.22)"/>' +
                    '    <polygon points="27,0 5,3 13,0 5,-3"    fill="rgba(255,255,255,.50)"/>' +
                    '    <polygon points="-27,0 -5,3 -13,0 -5,-3" fill="rgba(255,255,255,.50)"/>' +
                    '  </g>' +
                    '  <circle r="4" fill="rgba(255,255,255,.9)" stroke="rgba(0,0,0,.4)" stroke-width="0.8"/>' +
                    '  <circle r="2" fill="rgba(8,8,16,.9)"/>' +
                    '</g>' +
                    // Cardinal labels
                    '<text x="0"   y="-42" text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="4" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="11" font-weight="bold">N</text>' +
                    '<text x="44"  y="4"   text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="8">E</text>' +
                    '<text x="0"   y="50"  text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="8">S</text>' +
                    '<text x="-44" y="4"   text-anchor="middle" fill="#ffffff" stroke="rgba(0,0,0,.85)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="8">W</text>' +
                    // Arc from TN to SN — red, thicker
                    '<path id="compassArc" d="" fill="none" stroke="#d9381e" stroke-width="3" stroke-dasharray="3,2" opacity="0.9"/>' +
                    // Site North arm — red, thicker
                    '<g id="siteNorthArm">' +
                    '  <line x1="0" y1="0" x2="0" y2="-28" stroke="#d9381e" stroke-width="4" stroke-linecap="round"/>' +
                    '  <polygon points="0,-36 -5,-22 5,-22" fill="#d9381e"/>' +
                    '</g>' +
                    // Angle label — red, larger, white outline, pushed below circle
                    '<text id="compassDeg" x="0" y="74" text-anchor="middle" fill="#d9381e" stroke="rgba(255,255,255,.9)" stroke-width="3" paint-order="stroke" font-family="Segoe UI,Arial,sans-serif" font-size="10" font-weight="bold">SN 0.0\u00b0</text>' +
                    '</svg>';
                L.DomEvent.disableClickPropagation(div);
                return div;
            }
        });
        this.map.addControl(new NorthControl());
    },

    buildOpacityPanel: function() {
        const self = this;
        const OpCtrl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function() {
                var div = L.DomUtil.create('div', 'em-oc-ctrl leaflet-control');
                const pct = ConfigEngine.state.mapOpacity;
                div.innerHTML =
                    '<h4>Basemap Opacity</h4>' +
                    '<div class="em-oc-row">' +
                    '  <label>Active Layer</label>' +
                    '  <input type="range" id="satOpacitySlider" min="0" max="100" value="' + pct + '">' +
                    '  <span id="satOpacityVal">' + pct + '%</span>' +
                    '</div>' +
                    '';
                L.DomEvent.disableClickPropagation(div);
                L.DomEvent.disableScrollPropagation(div);
                return div;
            }
        });
        this.map.addControl(new OpCtrl());

        // Wire slider after control is added to DOM
        L.Util.requestAnimFrame(() => {
            const slider = document.getElementById('satOpacitySlider');
            const label  = document.getElementById('satOpacityVal');
            if (!slider) return;
            // Apply saved opacity to current active basemap
            if (self._activeBase) self._activeBase.setOpacity(ConfigEngine.state.mapOpacity / 100);
            slider.addEventListener('input', () => {
                const v = parseInt(slider.value);
                if (self._activeBase) self._activeBase.setOpacity(v / 100);
                label.textContent = v + '%';
                ConfigEngine.state.mapOpacity = v;
            });
        });
    },

    buildHelpControl: function() {
        const HelpControl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-helper');
                c.innerHTML = `?<div class="helper-popup"><strong>How to Align:</strong><ul>
                    <li>Drag the blue pin to reposition the lot.</li>
                    <li>Toggle <em>Snap to Grid</em> to lock to a 5 m coordinate grid.</li>
                    <li>Use the slider or type an angle to match the street right-of-way.</li>
                    <li>Click <em>Export LISP</em> to generate AutoCAD boundary code in CA Zone VI coords.</li>
                    <li>Click <em>Export Image</em> to save a PNG of the map view.</li>
                    <li>Click <em>Reset</em> to restore the default position and rotation.</li>
                </ul></div>`;
                L.DomEvent.disableClickPropagation(c);
                return c;
            }
        });
        this.map.addControl(new HelpControl());
    },

    buildDimDragToggle: function() {
        const self = this;
        const DimDragCtrl = L.Control.extend({
            options: { position: 'topright' },
            onAdd: function() {
                var c = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-dim-drag');
                c.innerHTML = '<a href="#" title="Toggle dimension drag mode — when active, click any dimension line to reveal a drag handle. Drag the handle to reposition the chain, then click it again to lock in place." role="button" aria-label="Toggle dimension drag">' +
                    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                    '<line x1="4" y1="12" x2="20" y2="12"/>' +
                    '<polyline points="8 8 4 12 8 16"/>' +
                    '<polyline points="16 8 20 12 16 16"/>' +
                    '<line x1="12" y1="4" x2="12" y2="8"/>' +
                    '<line x1="12" y1="16" x2="12" y2="20"/>' +
                    '</svg></a>';
                L.DomEvent.disableClickPropagation(c);
                c.querySelector('a').addEventListener('click', function(e) {
                    e.preventDefault();
                    self.dimDragMode = !self.dimDragMode;
                    c.classList.toggle('dim-drag-active', self.dimDragMode);
                    self.map.getContainer().classList.toggle('dim-drag-mode-on', self.dimDragMode);
                    if (self.dimDragMode && !self.showBldgDims) {
                        self.showBldgDims = true;
                        self.showDims = true;
                        const dimBtn = document.getElementById('bldgDimBtn');
                        if (dimBtn) { dimBtn.classList.add('active'); dimBtn.textContent = 'Hide Dims'; }
                    }
                    if (typeof SetbackEngine !== 'undefined') SetbackEngine.updateBldgDimLabels();
                });
                return c;
            }
        });
        this.map.addControl(new DimDragCtrl());
    },

    updateNorthArrow: function() {
        const arm  = document.getElementById('siteNorthArm');
        const deg  = document.getElementById('compassDeg');
        const arc  = document.getElementById('compassArc');
        if (!arm) return;
        const rot   = ConfigEngine.state.rotation;         // user-set rotation in degrees
        const rad   = rot * Math.PI / 180;
        // SN arm points toward the front of the lot — opposite of True North
        const angle = Math.atan2(-Math.cos(rad), -Math.sin(rad)) * 180 / Math.PI;
        arm.setAttribute('transform', 'rotate(' + angle.toFixed(2) + ')');
        // Show the rotation value the user actually controls
        if (deg) deg.textContent = rot.toFixed(1) + '\u00b0';
        // Arc from 0° to SN arm angle at r=22
        const normAngle = ((angle % 360) + 360) % 360;
        if (arc && Math.abs(rot) >= 0.5) {
            const r = 22, aRad = angle * Math.PI / 180;
            arc.setAttribute('d', 'M 0 -' + r + ' A ' + r + ' ' + r + ' 0 ' + (normAngle > 180 ? 1 : 0) + ' 1 ' +
                (r * Math.sin(aRad)).toFixed(2) + ' ' + (-r * Math.cos(aRad)).toFixed(2));
        } else if (arc) {
            arc.setAttribute('d', '');
        }
    },

    render: function() {
        const { width: w, depth: h, commercialDepth: cD, parcelPolygon } = ConfigEngine.data;
        // Normalize rotation to 0-360
        var rawRot = ConfigEngine.state.rotation % 360;
        if (rawRot < 0) rawRot += 360;
        ConfigEngine.state.rotation = rawRot;
        const rad    = rawRot * Math.PI / 180;
        const cos    = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT  = 364566;
        const F_LNG  = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const transform = (pt) => {
            let rx = pt.x * cos - pt.y * sin;
            let ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        // Lot boundary: use actual GIS parcel polygon if available, else rectangle
        if (parcelPolygon && parcelPolygon.length > 2) {
            this.lotPoly.setLatLngs(parcelPolygon);
        } else {
            // Base rectangle: front-right → rear-right → rear-left → front-left
            // c1={x:-h/2,y:w/2}, c2={x:h/2,y:w/2}, c3={x:h/2,y:-w/2}, c0={x:-h/2,y:-w/2}
            var baseLot = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
            // Corner visibility triangle chamfer (cuts a 45-deg corner at the street intersection)
            var sd = window.__SITE_DEFAULTS__ || {};
            var cvt = sd.cornerVisTriSize || 0;
            if (cvt > 0 && sd.cornerVisibilityTriangle) {
                var corner = sd.cornerVisCorner || 'front-left';
                // Resolve compass direction (SW/SE/NW/NE) to local corner based on rotation
                if (/^[NSEW]{2}$/i.test(corner)) {
                    var localCorners = [
                        {name:'front-left',  x:-h/2, y:-w/2},
                        {name:'front-right', x:-h/2, y: w/2},
                        {name:'rear-right',  x: h/2, y: w/2},
                        {name:'rear-left',   x: h/2, y:-w/2}
                    ];
                    var cu = corner.toUpperCase();
                    var targetX = (cu.indexOf('W') >= 0) ? -1 : 1; // west=-1, east=+1
                    var targetY = (cu.indexOf('S') >= 0) ? -1 : 1; // south=-1, north=+1
                    var best = null, bestScore = Infinity;
                    localCorners.forEach(function(c) {
                        var rx = c.x * cos - c.y * sin;
                        var ry = c.x * sin + c.y * cos;
                        var score = (rx - targetX * 999) * (rx - targetX * 999) + (ry - targetY * 999) * (ry - targetY * 999);
                        if (score < bestScore) { bestScore = score; best = c.name; }
                    });
                    corner = best;
                }
                if (corner === 'front-left') {
                    baseLot = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2+cvt,y:-w/2},{x:-h/2,y:-w/2+cvt}];
                } else if (corner === 'front-right') {
                    baseLot = [{x:-h/2,y:w/2-cvt},{x:-h/2+cvt,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
                } else if (corner === 'rear-left') {
                    baseLot = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2+cvt},{x:h/2-cvt,y:-w/2},{x:-h/2,y:-w/2}];
                } else if (corner === 'rear-right') {
                    baseLot = [{x:-h/2,y:w/2},{x:h/2-cvt,y:w/2},{x:h/2,y:w/2-cvt},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
                }
            }
            this.lotPoly.setLatLngs(baseLot.map(transform));
        }

        // Commercial zone: only draw when site has commercial depth > 0
        if (cD > 0) {
            const baseComm = [{x:-h/2,y:w/2},{x:-h/2+cD,y:w/2},{x:-h/2+cD,y:-w/2},{x:-h/2,y:-w/2}];
            this.commPoly.setLatLngs(baseComm.map(transform));
            if (ConfigEngine.state.commFront) {
                this.commPoly.setStyle({ fillOpacity: 0, fillColor: '#0f4c81', weight: 2, dashArray: '8 5', color: '#0f4c81' });
            } else {
                this.commPoly.setStyle({ fillOpacity: 0.15, fillColor: '#0f4c81', weight: 1, dashArray: null, color: '#0f4c81' });
            }
        } else {
            this.commPoly.setLatLngs([]);
        }
        this.updateNorthArrow();
        if (!this._isDragging) this.updateDimLabels();

        if (ConfigEngine.state.setbacksApplied) SetbackEngine.drawSetbacks();
        SetbackEngine.drawBuilding(this._isDragging);
        this.drawVehicles();

        // Debounced save — max once per 400ms, never during active drag
        if (!this._isDragging) {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => ExportEngine.save(), 400);
        }
    },

    updateDimLabels: function() {
        this.dimLabels.forEach(m => this.map.removeLayer(m));
        this.dimLabels = [];
        if (!this.showDims) return;

        const { width: w, depth: h } = ConfigEngine.data;
        const rot = ConfigEngine.state.rotation;
        const rad = rot * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const toLL = (pt) => {
            const rx = pt.x * cos - pt.y * sin;
            const ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        const OFF = 7;   // ft: dim line offset outward from lot edge
        const EX2 = 2;   // ft: witness line overshoot past dim line
        const TK  = 2.2; // ft: half-length of 45deg tick
        // Annotative text gap + zoom-scaled font
        const mapZoom   = this.map.getZoom();
        const fontScale = Math.max(0.72, 0.36 + mapZoom * 0.025); // grows with zoom: ~0.84 at z19, ~0.96 at z22
        const mPerPx    = 40075016.686 * Math.cos(ConfigEngine.state.lat * Math.PI / 180) / Math.pow(2, mapZoom + 8);
        const ftPerPx   = mPerPx * 3.28084;
        const TO        = 10 * ftPerPx;

        const push = layer => { this.dimLabels.push(layer); return layer; };
        const line = (pts) => push(L.polyline(pts.map(toLL), {
            color: '#1a202c', weight: 1.2, interactive: false, noClip: true
        }).addTo(this.map));

        // Lot corners: c0=front-left, c1=front-right, c2=rear-right, c3=rear-left
        const c0 = {x: -h/2, y: -w/2}, c1 = {x: -h/2, y:  w/2};
        const c2 = {x:  h/2, y:  w/2}, c3 = {x:  h/2, y: -w/2};

        // Each edge: two corner points, outward perpendicular, axis unit vector, label text, rotation
        // Label rotation follows the dimension line direction, normalized upright [-90, 90)
        const normalize = (a) => { a = ((a % 180) + 180) % 180; return a >= 90 ? a - 180 : a; };
        const wAngle = normalize(-rot - 90); // width edge → follows line
        const dAngle = normalize(-rot);      // depth edge → follows line

        const edges = [
            { p1: c0, p2: c1, px:-1, py: 0, ux: 0, uy: 1, text: w+' FT', rotA: wAngle, key:'lot_front' },
            { p1: c3, p2: c2, px: 1, py: 0, ux: 0, uy: 1, text: w+' FT', rotA: wAngle, key:'lot_rear'  },
            { p1: c1, p2: c2, px: 0, py: 1, ux: 1, uy: 0, text: h+' FT', rotA: dAngle, key:'lot_right' },
            { p1: c0, p2: c3, px: 0, py:-1, ux: 1, uy: 0, text: h+' FT', rotA: dAngle, key:'lot_left'  },
        ];

        edges.forEach((e) => {
            if (this.hiddenDimKeys.has(e.key)) return;
            const layers = [];
            const pLine = pts => { const l = line(pts); layers.push(l); return l; };

            // Dim line endpoints (offset outward from edge)
            const d1 = { x: e.p1.x + OFF*e.px, y: e.p1.y + OFF*e.py };
            const d2 = { x: e.p2.x + OFF*e.px, y: e.p2.y + OFF*e.py };
            // Extension (witness) lines from corners past dim line
            pLine([e.p1, { x: e.p1.x + (OFF+EX2)*e.px, y: e.p1.y + (OFF+EX2)*e.py }]);
            pLine([e.p2, { x: e.p2.x + (OFF+EX2)*e.px, y: e.p2.y + (OFF+EX2)*e.py }]);
            // Dim line split around text
            const mid = { x: (d1.x+d2.x)/2, y: (d1.y+d2.y)/2 };
            pLine([d1, { x: mid.x - TO*e.ux, y: mid.y - TO*e.uy }]);
            pLine([{ x: mid.x + TO*e.ux, y: mid.y + TO*e.uy }, d2]);
            // 45-deg ticks
            const tkX = (e.ux + e.px) * 0.7071 * TK;
            const tkY = (e.uy + e.py) * 0.7071 * TK;
            pLine([{ x: d1.x - tkX, y: d1.y - tkY }, { x: d1.x + tkX, y: d1.y + tkY }]);
            pLine([{ x: d2.x - tkX, y: d2.y - tkY }, { x: d2.x + tkX, y: d2.y + tkY }]);

            // Clickable label
            const pos = toLL({ x: mid.x + OFF*0.15*e.px, y: mid.y + OFF*0.15*e.py });
            const m = L.marker(toLL(mid), {
                icon: L.divIcon({
                    className: '',
                    html: '<div style="position:relative"><div class="dim-label" style="font-size:' + fontScale.toFixed(2) + 'em;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + e.rotA.toFixed(1) + 'deg)">' + e.text + '</div></div>',
                    iconSize: [0, 0], iconAnchor: [0, 0]
                }),
                interactive: true
            }).addTo(this.map);
            layers.push(m);
            push(m);
            // Click to hide entire dim group — persists across redraws
            m.on('click', () => {
                this.hiddenDimKeys.add(e.key);
                layers.forEach(l => this.map.removeLayer(l));
            });
        });
    },

    attachEvents: function() {
        // Redraw dims on zoom so annotative text gap stays constant
        this.map.on('zoomend', () => {
            this.updateDimLabels();
            if (this.showBldgDims) SetbackEngine.updateBldgDimLabels();
        });
        this.dragMarker.on('dragstart', () => { this._isDragging = true; });
        this.dragMarker.on('drag', () => {
            const raw = this.dragMarker.getLatLng();
            if (ConfigEngine.state.isSnapping) {
                const step = 0.00005;
                ConfigEngine.state.lat = Math.round(raw.lat / step) * step;
                ConfigEngine.state.lng = Math.round(raw.lng / step) * step;
            } else {
                ConfigEngine.state.lat = raw.lat;
                ConfigEngine.state.lng = raw.lng;
            }
            this.render();
        });
        this.dragMarker.on('dragend', () => {
            this._isDragging = false;
            if (ConfigEngine.state.isSnapping)
                this.dragMarker.setLatLng([ConfigEngine.state.lat, ConfigEngine.state.lng]);
            this.render();  // final render with dims restored
            ExportEngine.save();
        });

        const sldr = document.getElementById('rotationSlider');
        const inp  = document.getElementById('degInput');

        sldr.value = ConfigEngine.state.rotation;
        inp.value  = ConfigEngine.state.rotation.toFixed(1);

        sldr.addEventListener('input', (e) => {
            ConfigEngine.state.rotation = parseFloat(e.target.value);
            inp.value = ConfigEngine.state.rotation.toFixed(1);
            this.render();
        });
        inp.addEventListener('change', (e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v)) v = 0;
            v = ((v % 360) + 360) % 360;
            ConfigEngine.state.rotation = v;
            inp.value = v.toFixed(1); sldr.value = v;
            this.render();
        });
        document.getElementById('snapToggle').addEventListener('change', (e) => {
            ConfigEngine.state.isSnapping = e.target.checked;
            if (ConfigEngine.state.isSnapping) {
                this.map.addLayer(this.gridLayer); sldr.step = "5";
                const step = 0.00005;
                ConfigEngine.state.lat = Math.round(ConfigEngine.state.lat / step) * step;
                ConfigEngine.state.lng = Math.round(ConfigEngine.state.lng / step) * step;
                this.dragMarker.setLatLng([ConfigEngine.state.lat, ConfigEngine.state.lng]);
                ConfigEngine.state.rotation = Math.round(ConfigEngine.state.rotation / 5) * 5;
                sldr.value = ConfigEngine.state.rotation;
                inp.value  = ConfigEngine.state.rotation.toFixed(1);
                this.render();
            } else {
                this.map.removeLayer(this.gridLayer); sldr.step = "0.1";
            }
        });
        document.getElementById('resetBtn').addEventListener('click', () => {
            ConfigEngine.reset();

            // Sync map position + rotation inputs
            this.dragMarker.setLatLng([ConfigEngine.state.lat, ConfigEngine.state.lng]);
            this.map.setView([ConfigEngine.state.lat, ConfigEngine.state.lng]);
            sldr.value = ConfigEngine.state.rotation;
            inp.value  = ConfigEngine.state.rotation.toFixed(1);

            // Unlock if locked
            this.dragMarker.dragging.enable();
            this.dragMarker.setOpacity(1);
            sldr.disabled = false;
            inp.disabled  = false;
            const lockBtn = document.getElementById('lockPositionBtn');
            lockBtn.textContent = 'Lock Position';
            lockBtn.classList.remove('locked');

            // Reset dim state
            this.showBldgDims = false;
            this.showDims     = false;
            this.hiddenDimKeys.clear();
            this.chainWOffset = 0;
            this.chainDOffset = 0;
            this.dimDragMode  = false;
            this.map.getContainer().classList.remove('dim-drag-mode-on');
            const ddCtrl = document.querySelector('.leaflet-control-dim-drag');
            if (ddCtrl) ddCtrl.classList.remove('dim-drag-active');
            const dimBtn = document.getElementById('bldgDimBtn');
            if (dimBtn) { dimBtn.classList.remove('active'); dimBtn.textContent = 'Show Dims'; }

            // Reset sidebar inputs
            const sb = ConfigEngine.state.setbacks;
            document.getElementById('sb-front').value   = sb.front;
            document.getElementById('sb-rear').value    = sb.rear;
            document.getElementById('sb-side-l').value  = sb.sideL;
            document.getElementById('sb-side-r').value  = sb.sideR;
            const chk = document.getElementById('commFrontCheck');
            if (chk) chk.checked = false;

            // Reseed building inputs from default building
            SetbackEngine.rebuildSelector();
            SetbackEngine._seedInputsFromBuilding(0);

            this.render();

            // Save AFTER all MapEngine state is cleaned up so _payload() captures the full reset
            ExportEngine.save();
        });
        document.getElementById('recordBtn').addEventListener('click', () => ExportEngine.generateLISP());
        document.getElementById('imageExportBtn').addEventListener('click', () => ExportEngine.exportImage());
        document.getElementById('saveBoundaryBtn').addEventListener('click', () => {
            ExportEngine.save();
            const btn = document.getElementById('saveBoundaryBtn');
            btn.textContent = 'Saved!'; btn.style.background = '#38a169';
            setTimeout(() => { btn.textContent = 'Save Boundary'; btn.style.removeProperty('background'); }, 1500);
        });

        document.getElementById('lockPositionBtn').addEventListener('click', () => {
            ConfigEngine.state.locked = !ConfigEngine.state.locked;
            const locked = ConfigEngine.state.locked;
            const btn = document.getElementById('lockPositionBtn');
            btn.textContent = locked ? 'Locked' : 'Lock Position';
            btn.classList.toggle('locked', locked);
            if (locked) {
                this.dragMarker.dragging.disable();
                this.dragMarker.setOpacity(0.35);
            } else {
                this.dragMarker.dragging.enable();
                this.dragMarker.setOpacity(1);
            }
            sldr.disabled = locked;
            inp.disabled  = locked;
            ExportEngine.save();
        });

        // Restore lock visual state on load
        if (ConfigEngine.state.locked) {
            const btn = document.getElementById('lockPositionBtn');
            btn.textContent = 'Locked';
            btn.classList.add('locked');
            this.dragMarker.dragging.disable();
            this.dragMarker.setOpacity(0.35);
            sldr.disabled = true;
            inp.disabled  = true;
        }
    }
};
