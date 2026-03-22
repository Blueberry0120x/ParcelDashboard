    /* ==========================================
       BOOTSTRAP
       ========================================== */
    window.onload = function() {
        document.body.style.zoom = '0.9';
        ConfigEngine.init();
        UIEngine.init();
        MapEngine.init();
        SetbackEngine.initBuildingConfig();
        ElevationTool.init();
        ResizeEngine.init();

        // Sync toggle button states from saved config
        (function() {
            var s = ConfigEngine.state;
            var fdBtn = document.getElementById('freeDragBtn');
            var seBtn = document.getElementById('snapEdgeBtn');
            if (fdBtn) {
                if (s.freeDrag) { fdBtn.style.background = '#d97706'; fdBtn.style.color = '#fff'; fdBtn.textContent = 'Free Drag ON'; }
                else            { fdBtn.style.background = '';        fdBtn.style.color = '';     fdBtn.textContent = 'Free Drag'; }
            }
            if (seBtn) {
                if (s.snapEdge) { seBtn.style.background = '#e11d48'; seBtn.style.color = '#fff'; seBtn.textContent = 'Snap ON'; }
                else            { seBtn.style.background = '';        seBtn.style.color = '';     seBtn.textContent = 'Snap Edge'; }
            }
        })();

        // Vehicle input wiring
        var vehType   = document.getElementById('vehType');
        var vehOrient = document.getElementById('vehOrient');
        if (vehType) vehType.addEventListener('change', function() {
            var vs = ConfigEngine.state.vehicles || [];
            var v  = vs[ConfigEngine.state.activeVehicle];
            if (!v) return;
            v.type = vehType.value;
            var spec = MapEngine.VEHICLE_TYPES[v.type] || MapEngine.VEHICLE_TYPES.sedan;
            var szEl = document.getElementById('vehSizeLabel');
            if (szEl) szEl.textContent = spec.W + "' x " + spec.D + "'";
            MapEngine.drawVehicles();
            ExportEngine.save();
        });
        if (vehOrient) vehOrient.addEventListener('input', function() {
            var vs = ConfigEngine.state.vehicles || [];
            var v  = vs[ConfigEngine.state.activeVehicle];
            if (!v) return;
            v.orientation = parseFloat(vehOrient.value) || 0;
            MapEngine.drawVehicles();
            ExportEngine.save();
        });

        // Restore vehicles from state
        if (ConfigEngine.state.vehicles && ConfigEngine.state.vehicles.length > 0) {
            MapEngine.drawVehicles();
            MapEngine._rebuildVehicleTabs();
            MapEngine._seedVehicleInputs(ConfigEngine.state.activeVehicle);
        }
    };
