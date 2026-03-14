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
        document.getElementById('bldgOrientInput').value  = bldg.orientation.toFixed(1);
        document.getElementById('bldgOrientSlider').value = bldg.orientation;
        document.getElementById('bldgWidth').value        = bldg.width;
        document.getElementById('bldgHeight').value       = bldg.height;
        document.getElementById('bldgOffsetX').value      = (bldg.offsetX || 0).toFixed(1);
        document.getElementById('bldgOffsetY').value      = (bldg.offsetY || 0).toFixed(1);

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

        // Save Config button
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        // Draw on load if config exists
        if (bldg.width && bldg.height) this.drawBuilding();
    },

    saveConfig: function() {
        const btn = document.getElementById('saveConfigBtn');
        const cfg = ConfigEngine.state.buildingConfig;
        cfg.orientation = parseFloat(document.getElementById('bldgOrientInput').value) || 0;
        cfg.width       = parseFloat(document.getElementById('bldgWidth').value)       || 30;
        cfg.height      = parseFloat(document.getElementById('bldgHeight').value)      || 60;
        cfg.offsetX     = parseFloat(document.getElementById('bldgOffsetX').value)     || 0;
        cfg.offsetY     = parseFloat(document.getElementById('bldgOffsetY').value)     || 0;
        localStorage.setItem('building_config', JSON.stringify(cfg));
        this.drawBuilding();
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Config'; btn.style.background = ''; }, 1800);
    },

    drawBuilding: function(skipMarker) {
        if (!MapEngine.buildingPoly) return;
        const state = ConfigEngine.state;
        const bldg  = state.buildingConfig;
        const { front, rear, sideL, sideR } = state.setbacks;

        // Building center = buildable area center + user offset (lot-local coords)
        const cx = (front - rear) / 2 + (bldg.offsetX || 0);
        const cy = (sideR - sideL) / 2 + (bldg.offsetY || 0);

        const hw = bldg.width / 2, hh = bldg.height / 2;
        const raw = [
            { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
            { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
        ];

        // Rotate corners around building center by building orientation
        const bRad = bldg.orientation * Math.PI / 180;
        const bCos = Math.cos(bRad), bSin = Math.sin(bRad);
        const oriented = raw.map(pt => {
            const dx = pt.x - cx, dy = pt.y - cy;
            return { x: cx + dx * bCos - dy * bSin, y: cy + dx * bSin + dy * bCos };
        });

        // Apply lot rotation → lat/lng
        const lRad  = state.rotation * Math.PI / 180;
        const lCos  = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
        const toLatLng = pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        };

        MapEngine.buildingPoly.setLatLngs(oriented.map(toLatLng));

        // Reposition drag marker to building center (unless dragging)
        if (!skipMarker && MapEngine.buildingMarker) {
            MapEngine.buildingMarker.setLatLng(toLatLng({ x: cx, y: cy }));
        }
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
