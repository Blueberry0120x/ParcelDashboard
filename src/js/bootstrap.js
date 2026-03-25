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

        // Populate CAD coordinate system dropdown
        (function() {
            var sel = document.getElementById('cadZoneSelect');
            if (!sel) return;
            var systems = ConfigEngine.CAD_SYSTEMS;
            var active = ConfigEngine.data.cadZone || 'CA_VI';
            Object.keys(systems).forEach(function(key) {
                var opt = document.createElement('option');
                opt.value = key;
                opt.textContent = systems[key].label;
                if (key === active) opt.selected = true;
                sel.appendChild(opt);
            });
            // Show active zone label
            var lbl = document.getElementById('cadZoneLabel');
            if (lbl && systems[active]) lbl.textContent = systems[active].label;
        })();

        // Populate site switcher from __SITE_LIST__ (injected by build script)
        (function() {
            var sel = document.getElementById('site-switcher');
            if (!sel) return;
            var sites = window.__SITE_LIST__ || [];
            var sd = window.__SITE_DEFAULTS__ || {};
            var activeSite = localStorage.getItem('selected_site') || sd.siteId || '';
            if (sites.length > 0) {
                sites.forEach(function(s) {
                    var opt = document.createElement('option');
                    opt.value = s.siteId;
                    opt.textContent = s.address;
                    if (s.siteId === activeSite) opt.selected = true;
                    sel.appendChild(opt);
                });
            } else {
                // Fallback: no site list injected
                var opt = document.createElement('option');
                opt.value = sd.siteId || '';
                opt.textContent = sd.address || ConfigEngine.data.address;
                opt.selected = true;
                sel.appendChild(opt);
            }
        })();
    };
