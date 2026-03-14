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

        // Save Config button
        document.getElementById('saveConfigBtn').addEventListener('click', () => this.saveConfig());

        // Draw on load if config exists
        if (bldg.width && bldg.height) this.drawBuilding();
    },

    saveConfig: function() {
        const btn = document.getElementById('saveConfigBtn');
        const orientation = parseFloat(document.getElementById('bldgOrientInput').value) || 0;
        const width       = parseFloat(document.getElementById('bldgWidth').value)       || 30;
        const height      = parseFloat(document.getElementById('bldgHeight').value)      || 60;
        ConfigEngine.state.buildingConfig = { orientation, width, height };
        localStorage.setItem('building_config', JSON.stringify(ConfigEngine.state.buildingConfig));
        this.drawBuilding();
        btn.textContent = 'Saved!'; btn.style.background = '#2f855a';
        setTimeout(() => { btn.textContent = 'Save Config'; btn.style.background = ''; }, 1800);
    },

    drawBuilding: function() {
        if (!MapEngine.buildingPoly) return;
        const state = ConfigEngine.state;
        const bldg  = state.buildingConfig;
        const { front, rear, sideL, sideR } = state.setbacks;
        const { depth: lotH, width: lotW }  = ConfigEngine.data;

        // Center of buildable area relative to lot center
        const cx = (front - rear) / 2;
        const cy = (sideR - sideL) / 2;

        // Building half-dims
        const hw = bldg.width / 2, hh = bldg.height / 2;

        // Corners centered at building center (cx, cy)
        const raw = [
            { x: cx - hh, y: cy + hw }, { x: cx + hh, y: cy + hw },
            { x: cx + hh, y: cy - hw }, { x: cx - hh, y: cy - hw }
        ];

        // Apply building orientation rotation around its own center
        const bRad = bldg.orientation * Math.PI / 180;
        const bCos = Math.cos(bRad), bSin = Math.sin(bRad);
        const oriented = raw.map(pt => {
            const dx = pt.x - cx, dy = pt.y - cy;
            return { x: cx + dx * bCos - dy * bSin, y: cy + dx * bSin + dy * bCos };
        });

        // Apply lot rotation to map lat/lng
        const lRad  = state.rotation * Math.PI / 180;
        const lCos  = Math.cos(lRad), lSin = Math.sin(lRad);
        const F_LAT = 364566;
        const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);

        const latLngs = oriented.map(pt => {
            const rx = pt.x * lCos - pt.y * lSin;
            const ry = pt.x * lSin + pt.y * lCos;
            return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
        });

        MapEngine.buildingPoly.setLatLngs(latLngs);
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
