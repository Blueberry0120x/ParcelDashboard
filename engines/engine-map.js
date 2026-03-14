/* ==========================================
   ENGINE 3: MAP & GEOMETRY
   ========================================== */
const MapEngine = {
    map: null, dragMarker: null, lotPoly: null, commPoly: null,
    gridLayer: null, setbackPoly: null,

    init: function() {
        const osm  = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true });
        const sat  = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxNativeZoom: 19, maxZoom: 23, crossOrigin: true });
        const topo = L.tileLayer('https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}', {
            maxNativeZoom: 16, maxZoom: 23, crossOrigin: true, attribution: 'USGS The National Map'
        });

        this.map = L.map('map', {
            center: [ConfigEngine.state.lat, ConfigEngine.state.lng],
            zoom: 19, maxZoom: 23, layers: [osm],
            fullscreenControl: true, fullscreenControlOptions: { position: 'topleft' }
        });
        L.control.layers({ "Street Map": osm, "USGS Topo": topo, "Satellite": sat }).addTo(this.map);

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
        this.setbackPoly = L.polygon([], { color: '#f6c90e', weight: 2, fillOpacity: 0, dashArray: '7 4', noClip: true }).addTo(this.map);
        this.dragMarker  = L.marker([ConfigEngine.state.lat, ConfigEngine.state.lng], { draggable: true }).addTo(this.map);

        this.attachEvents();
        this.render();
        L.Util.requestAnimFrame(() => this.map.invalidateSize());
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
        this.commPoly.setLatLngs(baseComm.map(transform));
        this.updateNorthArrow();

        if (ConfigEngine.state.setbacksApplied) SetbackEngine.drawSetbacks();

        ConfigEngine.save();
    },

    attachEvents: function() {
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

        // Seed inputs from restored state (localStorage may differ from HTML defaults)
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
    }
};
