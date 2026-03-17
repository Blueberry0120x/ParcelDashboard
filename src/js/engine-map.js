/* ==========================================
   ENGINE 3: MAP & GEOMETRY
   ========================================== */
const MapEngine = {
    map: null, dragMarker: null, lotPoly: null, commPoly: null,
    gridLayer: null, setbackPoly: null, buildingPolys: [], buildingMarkers: [],
    dimLabels: [], showDims: false,
    bldgDimLabels: [], showBldgDims: false,
    hiddenDimKeys: new Set(),  // persists across redraws; cleared on dim toggle

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

        this.lotPoly     = L.polygon([], { color: '#d9381e', weight: 3, fillOpacity: 0, noClip: true }).addTo(this.map);
        this.commPoly    = L.polygon([], { color: '#0f4c81', weight: 1, fillColor: '#0f4c81', fillOpacity: 0.3, noClip: true }).addTo(this.map);
        this.setbackPoly = L.polygon([], { color: '#f6c90e', weight: 2, fillOpacity: 0,   dashArray: '7 4', noClip: true }).addTo(this.map);
        this.dragMarker  = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], { draggable: true }).addTo(this.map);

        this.attachEvents();
        this.render();
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
            if (idx > 0) {
                const prev       = state.buildings[idx - 1];
                const prevExt    = SetbackEngine._buildingExtents(prev);
                const thisExt    = SetbackEngine._buildingExtents(bldg);
                const minOffsetX = prev.offsetX + prevExt.halfDepth + thisExt.halfDepth;
                newOffsetX       = Math.max(minOffsetX, newOffsetX);
                bldg.spacing     = parseFloat((newOffsetX - prev.offsetX - prevExt.halfDepth - thisExt.halfDepth).toFixed(1));
            }
            bldg.offsetX = newOffsetX;
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
            SetbackEngine.drawBuilding();
        });
        return m;
    },

    buildNorthArrow: function() {
        const NorthControl = L.Control.extend({
            options: { position: 'topleft' },
            onAdd: function() {
                var div = L.DomUtil.create('div', 'north-compass-wrap');
                div.innerHTML = `
                  <svg id="compassSvg" viewBox="0 0 40 54" width="40" height="54">
                    <defs>
                      <filter id="nshadow" x="-30%" y="-30%" width="160%" height="160%">
                        <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.25"/>
                      </filter>
                    </defs>
                    <g filter="url(#nshadow)">
                      <polygon points="20,5 17,25 20,23 23,25" fill="#0f4c81"/>
                      <polygon points="20,45 17,25 20,27 23,25" fill="rgba(15,76,129,0.2)"/>
                    </g>
                    <text x="20" y="52" text-anchor="middle" font-size="7" font-weight="800"
                          fill="#0f4c81" font-family="Segoe UI,sans-serif" letter-spacing="0.3">N</text>
                    <g id="siteNorthArm" transform="rotate(0 20 25)">
                      <polygon points="20,8 18.2,15 21.8,15" fill="#d9381e" opacity="0.92"/>
                      <line x1="20" y1="8" x2="20" y2="25" stroke="#d9381e" stroke-width="1.6" stroke-dasharray="3,2.2"/>
                      <text x="20" y="5.5" text-anchor="middle" font-size="6" font-weight="800"
                            fill="#d9381e" font-family="Segoe UI,sans-serif">F</text>
                    </g>
                    <circle cx="20" cy="25" r="2.5" fill="#1a1a1a" opacity="0.75"/>
                  </svg>`;
                L.DomEvent.disableClickPropagation(div);
                return div;
            }
        });
        this.map.addControl(new NorthControl());
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

    updateNorthArrow: function() {
        const arm = document.getElementById('siteNorthArm');
        if (!arm) return;
        const rad   = ConfigEngine.state.rotation * Math.PI / 180;
        const angle = Math.atan2(-Math.cos(rad), -Math.sin(rad)) * 180 / Math.PI;
        arm.setAttribute('transform', `rotate(${angle.toFixed(2)} 20 25)`);
    },

    render: function() {
        const { width: w, depth: h, commercialDepth: cD } = ConfigEngine.data;
        const baseLot  = [{x:-h/2,y:w/2},{x:h/2,y:w/2},{x:h/2,y:-w/2},{x:-h/2,y:-w/2}];
        const baseComm = [{x:-h/2,y:w/2},{x:-h/2+cD,y:w/2},{x:-h/2+cD,y:-w/2},{x:-h/2,y:-w/2}];

        const rad    = ConfigEngine.state.rotation * Math.PI / 180;
        const cos    = Math.cos(rad), sin = Math.sin(rad);
        const F_LAT  = 364566;
        const F_LNG  = 365228 * Math.cos(ConfigEngine.state.lat * Math.PI / 180);

        const transform = (pt) => {
            let rx = pt.x * cos - pt.y * sin;
            let ry = pt.x * sin + pt.y * cos;
            return [ConfigEngine.state.lat + ry / F_LAT, ConfigEngine.state.lng + rx / F_LNG];
        };

        this.lotPoly.setLatLngs(baseLot.map(transform));
        // Always show 30ft commercial zone; style depends on comm checkbox
        this.commPoly.setLatLngs(baseComm.map(transform));
        if (ConfigEngine.state.commFront) {
            // Comm active: dashed line only, no fill
            this.commPoly.setStyle({ fillOpacity: 0, fillColor: '#0f4c81', weight: 2, dashArray: '8 5', color: '#0f4c81' });
        } else {
            // Comm not active: show as hatch/fill (setback indicator)
            this.commPoly.setStyle({ fillOpacity: 0.15, fillColor: '#0f4c81', weight: 1, dashArray: null, color: '#0f4c81' });
        }
        this.updateNorthArrow();
        this.updateDimLabels();

        if (ConfigEngine.state.setbacksApplied) SetbackEngine.drawSetbacks();
        SetbackEngine.drawBuilding();

        ConfigEngine.save();
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
        // Annotative text gap
        const mapZoom   = this.map.getZoom();
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
        const edges = [
            { p1: c0, p2: c1, px:-1, py: 0, ux: 0, uy: 1, text: w+' FT', rotA: 0,   key:'lot_front' }, // front — horizontal text
            { p1: c3, p2: c2, px: 1, py: 0, ux: 0, uy: 1, text: w+' FT', rotA: 0,   key:'lot_rear'  }, // rear  — horizontal text
            { p1: c1, p2: c2, px: 0, py: 1, ux: 1, uy: 0, text: h+' FT', rotA: -90, key:'lot_right' }, // right — vertical text
            { p1: c0, p2: c3, px: 0, py:-1, ux: 1, uy: 0, text: h+' FT', rotA: -90, key:'lot_left'  }, // left  — vertical text
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
                    html: '<div style="position:relative"><div class="dim-label" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%) rotate(' + e.rotA.toFixed(1) + 'deg)">' + e.text + '</div></div>',
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
            this.dimLabels.push(m);
        });
    },

    attachEvents: function() {
        // Redraw dims on zoom so annotative text gap stays constant
        this.map.on('zoomend', () => {
            this.updateDimLabels();
            if (this.showBldgDims) SetbackEngine.updateBldgDimLabels();
        });
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
            if (ConfigEngine.state.isSnapping)
                this.dragMarker.setLatLng([ConfigEngine.state.lat, ConfigEngine.state.lng]);
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
            v = Math.max(-90, Math.min(90, v));
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
            this.dragMarker.setLatLng([ConfigEngine.state.lat, ConfigEngine.state.lng]);
            this.map.setView([ConfigEngine.state.lat, ConfigEngine.state.lng]);
            sldr.value = ConfigEngine.state.rotation;
            inp.value  = ConfigEngine.state.rotation.toFixed(1);
            this.render();
        });
        document.getElementById('recordBtn').addEventListener('click', () => ExportEngine.generateLISP());
        document.getElementById('imageExportBtn').addEventListener('click', () => ExportEngine.exportImage());
        document.getElementById('saveBoundaryBtn').addEventListener('click', () => ExportEngine.saveBoundary());

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
            localStorage.setItem('site_locked', locked ? '1' : '0');
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
