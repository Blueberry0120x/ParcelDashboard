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

    initBuildingConfig: function() {
        const bldg = ConfigEngine.state.buildingConfig;
        const sb   = ConfigEngine.state.setbacks;

        // Restore setback inputs from saved state
        document.getElementById('sb-front').value   = sb.front;
        document.getElementById('sb-rear').value    = sb.rear;
        document.getElementById('sb-side-l').value  = sb.sideL;
        document.getElementById('sb-side-r').value  = sb.sideR;

        // Seed building config inputs
        document.getElementById('bldgOrientInput').value   = bldg.orientation.toFixed(1);
        document.getElementById('bldgOrientSlider').value  = bldg.orientation;
        document.getElementById('bldgWidth').value         = bldg.width;
        document.getElementById('bldgHeight').value        = bldg.height;
        document.getElementById('bldgOffsetX').value       = (bldg.offsetX  || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value       = (bldg.offsetY  || 0).toFixed(1);
        document.getElementById('bldgCount').value         = bldg.count     || 1;
        document.getElementById('bldgStories').value       = bldg.stories   || 1;
        document.getElementById('bldgSpacingInput').value  = (bldg.spacing  || 0).toFixed(1);
        document.getElementById('bldgSpacingSlider').value = bldg.spacing   || 0;

        // Auto-restore setback lines if saved
        if (localStorage.getItem('saved_setbacks')) {
            ConfigEngine.state.setbacksApplied = true;
            this.drawSetbacks();
        }

        // Save Setbacks button
        document.getElementById('saveSetbackBtn').addEventListener('click', () => this.saveSetbacks());

        // Orientation slider <-> input sync + live redraw
        const sldr = document.getElementById('bldgOrientSlider');
        const inp  = document.getElementById('bldgOrientInput');
        sldr.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            inp.value = v.toFixed(1);
            ConfigEngine.state.buildingConfig.orientation = v;
            this.drawBuilding();
        });
        inp.addEventListener('change', (e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v)) v = 0;
            v = Math.max(-90, Math.min(90, v));
            inp.value = v.toFixed(1); sldr.value = v;
            ConfigEngine.state.buildingConfig.orientation = v;
            this.drawBuilding();
        });

        // Footprint inputs live redraw
        ['bldgWidth', 'bldgHeight'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                ConfigEngine.state.buildingConfig.width  = parseFloat(document.getElementById('bldgWidth').value)  || 30;
                ConfigEngine.state.buildingConfig.height = parseFloat(document.getElementById('bldgHeight').value) || 60;
                this.drawBuilding();
            });
        });

        // Offset inputs live redraw
        ['bldgOffsetX', 'bldgOffsetY'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => {
                ConfigEngine.state.buildingConfig.offsetX = parseFloat(document.getElementById('bldgOffsetX').value) || 0;
                ConfigEngine.state.buildingConfig.offsetY = parseFloat(document.getElementById('bldgOffsetY').value) || 0;
                this.drawBuilding();
            });
        });

        // Count and Stories inputs
        document.getElementById('bldgCount').addEventListener('change', () => {
            ConfigEngine.state.buildingConfig.count = parseInt(document.getElementById('bldgCount').value) || 1;
            this.drawBuilding();
        });
        document.getElementById('bldgStories').addEventListener('change', () => {
            ConfigEngine.state.buildingConfig.stories = parseInt(document.getElementById('bldgStories').value) || 1;
            this.updateFAR();
        });

        // Spacing slider <-> input sync + live redraw
        const spSldr = document.getElementById('bldgSpacingSlider');
        const spInp  = document.getElementById('bldgSpacingInput');
        spSldr.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            spInp.value = v.toFixed(1);
            ConfigEngine.state.buildingConfig.spacing = v;
            this.drawBuilding();
        });
        spInp.addEventListener('change', (e) => {
            let v = parseFloat(e.target.value);
            if (isNaN(v) || v < 0) v = 0;
            v = Math.min(50, v);
            spInp.value = v.toFixed(1); spSldr.value = v;
            ConfigEngine.state.buildingConfig.spacing = v;
            this.drawBuilding();
        });

        // Save Config button
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        // Draw on load if config exists
        if (bldg.width && bldg.height) this.drawBuilding();
    },

    saveConfig: function() {
        const btn = document.getElementById('saveConfigBtn');
        const cfg = ConfigEngine.state.buildingConfig;
        cfg.orientation = parseFloat(document.getElementById('bldgOrientInput').value)  || 0;
        cfg.width       = parseFloat(document.getElementById('bldgWidth').value)        || 30;
        cfg.height      = parseFloat(document.getElementById('bldgHeight').value)       || 60;
        cfg.offsetX     = parseFloat(document.getElementById('bldgOffsetX').value)      || 0;
        cfg.offsetY     = parseFloat(document.getElementById('bldgOffsetY').value)      || 0;
        cfg.count       = parseInt(document.getElementById('bldgCount').value)          || 1;
        cfg.stories     = parseInt(document.getElementById('bldgStories').value)        || 1;
        cfg.spacing     = parseFloat(document.getElementById('bldgSpacingInput').value) || 0;
        localStorage.setItem('building_config', JSON.stringify(cfg));
        this.drawBuilding();
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Config'; btn.style.background = ''; }, 1800);
    },

    updateFAR: function() {
        const bldg    = ConfigEngine.state.buildingConfig;
        const { width: lotW, depth: lotD } = ConfigEngine.data;
        const lotArea = lotW * lotD;
        if (!lotArea) return;
        const far = ((bldg.count || 1) * bldg.width * bldg.height * (bldg.stories || 1)) / lotArea;
        const el = document.getElementById('bldgFAR');
        if (el) el.textContent = far.toFixed(2);
    },

    drawBuilding: function(skipMarker) {
        if (!MapEngine.map) return;
        const state   = ConfigEngine.state;
        const bldg    = state.buildingConfig;
        const { front, rear, sideL, sideR } = state.setbacks;
        const count   = Math.max(1, bldg.count   || 1);
        const spacing = bldg.spacing || 0;

        // Ensure correct number of polygons
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

        // Base center in lot-local coords
        const baseCx = (front - rear) / 2 + (bldg.offsetX || 0);
        const cy     = (sideR - sideL) / 2 + (bldg.offsetY || 0);

        const hw = bldg.width / 2, hh = bldg.height / 2;

        const bRad = bldg.orientation * Math.PI / 180;
        const bCos = Math.cos(bRad), bSin = Math.sin(bRad);
        const lRad = state.rotation * Math.PI / 180;
        const lCos = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);

        const toLatLng = pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        };

        // Stack buildings along depth axis, centered on baseCx
        for (let i = 0; i < count; i++) {
            const cx = baseCx + (i - (count - 1) / 2) * (bldg.height + spacing);
            const raw = [
                { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
                { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
            ];
            const oriented = raw.map(pt => {
                const dx = pt.x - cx, dy = pt.y - cy;
                return { x: cx + dx * bCos - dy * bSin, y: cy + dx * bSin + dy * bCos };
            });
            MapEngine.buildingPolys[i].setLatLngs(oriented.map(toLatLng));
        }

        // Drag marker stays at base center (offset origin)
        if (!skipMarker && MapEngine.buildingMarker) {
            MapEngine.buildingMarker.setLatLng(toLatLng({ x: baseCx, y: cy }));
        }

        this.updateFAR();
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
