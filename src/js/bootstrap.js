    /* ==========================================
       BOOTSTRAP
       ========================================== */
    window.onload = function() {
        document.body.style.zoom = '0.9';
        function safeRun(label, fn) {
            try { fn(); }
            catch (e) { console.error('[BOOTSTRAP] ' + label + ' failed:', e); }
        }
        function safeStorageGet(key) {
            try { return localStorage.getItem(key); }
            catch (e) { return null; }
        }
        function safeStorageSet(key, val) {
            try { localStorage.setItem(key, val); }
            catch (e) {}
        }
        function safeStorageRemove(key) {
            try { localStorage.removeItem(key); }
            catch (e) {}
        }
        function getStateFromSiteId(siteId) {
            return siteId ? siteId.split('-')[0] : '';
        }

        window.switchSite = function(siteId) {
            if (!siteId) return;
            var sd = window.__SITE_DEFAULTS__ || {};
            var stateCode = getStateFromSiteId(siteId);
            safeStorageSet('selected_site', siteId);
            if (stateCode) safeStorageSet('selected_state', stateCode);
            safeStorageRemove('site_state');
            if (siteId === sd.siteId) { location.reload(); return; }
            if (location.protocol === 'file:') { location.reload(); return; }
            fetch('/api/sites/' + encodeURIComponent(siteId) + '/activate', { method: 'POST' })
                .then(function(r) { if (!r.ok) throw new Error('activate failed'); return r.text(); })
                .then(function() { location.reload(); })
                .catch(function() { location.reload(); });
        };


        // Offline site switching: if user selected a different site, override __SITE_DEFAULTS__
        // with the matching entry from __ALL_SITE_DATA__ (baked in at build time).
        // This makes file:// site-switching work without a server rebuild.
        (function() {
            var selectedId = safeStorageGet('selected_site');
            if (selectedId && window.__ALL_SITE_DATA__ && window.__SITE_DEFAULTS__) {
                var current = window.__SITE_DEFAULTS__;
                if (current.siteId && selectedId !== current.siteId && window.__ALL_SITE_DATA__[selectedId]) {
                    window.__SITE_DEFAULTS__ = window.__ALL_SITE_DATA__[selectedId];
                }
            }
        })();

        safeRun('ConfigEngine.init', function() { ConfigEngine.init(); });
        // Only run UIEngine.init if required fields are present
        var d = (typeof ConfigEngine !== 'undefined' && ConfigEngine.data) ? ConfigEngine.data : null;
        var required = ["address","apn","zoning","width","depth","lotSF"];
        var missing = d ? required.filter(function(k){return !(k in d) || d[k]==null || d[k]===''}) : required;
        if (missing.length === 0) {
            safeRun('UIEngine.init', function() { UIEngine.init(); });
        } else {
            console.error('[BOOTSTRAP] UIEngine.init skipped: missing fields', missing, d);
            // Optionally, show a user-visible error or fallback UI here
        }

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

        // Populate CAD coordinate system dropdown
        (function() {
            var sel = document.getElementById('cadZoneSelect');
            if (!sel) return;
            var systems = ConfigEngine.CAD_SYSTEMS;
            var siteState = getStateFromSiteId(ConfigEngine.data.siteId) || 'CA';
            var active = ConfigEngine.data.cadZone || 'CA_VI';
            Object.keys(systems).filter(function(key) {
                return key.indexOf(siteState + '_') === 0;
            }).forEach(function(key) {
                var opt = document.createElement('option');
                opt.value = key;
                opt.textContent = systems[key].label;
                if (key === active) opt.selected = true;
                sel.appendChild(opt);
            });
            if (!sel.value && sel.options.length > 0) {
                sel.selectedIndex = 0;
                active = sel.value;
                var fallback = systems[active];
                if (fallback) {
                    ConfigEngine.cad.projection = fallback.projection;
                    ConfigEngine.cad.proj4Def   = fallback.proj4Def;
                    ConfigEngine.data.cadZone   = active;
                }
            }
            // Show active zone label
            var lbl = document.getElementById('cadZoneLabel');
            if (lbl && systems[active]) lbl.textContent = systems[active].label;
        })();

        // Populate project title from site data
        (function() {
            var sd = window.__SITE_DEFAULTS__ || {};
            var h1 = document.getElementById('project-title');
            if (h1 && sd.project) h1.textContent = sd.project;
        })();

        // Populate state filter + site switcher from __SITE_LIST__ (injected by build script)
        (function() {
            var siteSel  = document.getElementById('site-switcher');
            var stateSel = document.getElementById('state-filter');
            var sites    = window.__SITE_LIST__ || [];
            var sd       = window.__SITE_DEFAULTS__ || {};
            var activeSite  = safeStorageGet('selected_site') || sd.siteId || '';
            var activeState = safeStorageGet('selected_state') ||
                              (activeSite ? activeSite.split('-')[0] : '');

            function getState(siteId) { return siteId ? siteId.split('-')[0] : ''; }

            function populateSites(stateFilter) {
                if (!siteSel) return;
                while (siteSel.firstChild) siteSel.removeChild(siteSel.firstChild);
                var filtered = stateFilter
                    ? sites.filter(function(s) { return getState(s.siteId) === stateFilter; })
                    : sites;
                if (filtered.length > 0) {
                    if (!filtered.some(function(s) { return s.siteId === activeSite; })) {
                        activeSite = filtered[0].siteId;
                        safeStorageSet('selected_site', activeSite);
                    }
                    filtered.forEach(function(s) {
                        var opt = document.createElement('option');
                        opt.value = s.siteId;
                        opt.textContent = s.address;
                        if (s.siteId === activeSite) opt.selected = true;
                        siteSel.appendChild(opt);
                    });
                } else {
                    var opt = document.createElement('option');
                    opt.value = sd.siteId || '';
                    opt.textContent = sd.address || ConfigEngine.data.address;
                    opt.selected = true;
                    siteSel.appendChild(opt);
                }
            }

            // Build state dropdown
            if (stateSel && sites.length > 0) {
                var states = [];
                sites.forEach(function(s) {
                    var st = getState(s.siteId);
                    if (st && states.indexOf(st) === -1) states.push(st);
                });
                states.sort();
                if (states.length > 1) {
                    states.forEach(function(st) {
                        var opt = document.createElement('option');
                        opt.value = st;
                        opt.textContent = st;
                        if (st === activeState) opt.selected = true;
                        stateSel.appendChild(opt);
                    });
                    stateSel.addEventListener('change', function() {
                        activeState = stateSel.value;
                        safeStorageSet('selected_state', activeState);
                        populateSites(activeState);
                    });
                } else {
                    // Only one state — hide the filter
                    var parent = stateSel.closest('.suite-bar-state');
                    if (parent) parent.style.display = 'none';
                }
            }

            populateSites(activeState || null);
        })();

        safeRun('MapEngine.init', function() { MapEngine.init(); });
        // Restore vehicles AFTER MapEngine.init() so the map exists before drawing
        if (ConfigEngine.state.vehicles && ConfigEngine.state.vehicles.length > 0) {
            MapEngine.drawVehicles();
            MapEngine._rebuildVehicleTabs();
            MapEngine._seedVehicleInputs(ConfigEngine.state.activeVehicle);
        }
        safeRun('SetbackEngine.initBuildingConfig', function() { SetbackEngine.initBuildingConfig(); });
        safeRun('ElevationTool.init', function() { ElevationTool.init(); });
        safeRun('ResizeEngine.init', function() { ResizeEngine.init(); });
    };
