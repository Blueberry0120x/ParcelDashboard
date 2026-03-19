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
