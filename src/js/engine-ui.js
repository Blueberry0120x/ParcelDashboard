/* ==========================================
   ENGINE 2: USER INTERFACE
   ========================================== */
const UIEngine = {
    init: function() {
        const d    = ConfigEngine.data;
        const rectSqft = d.width * d.depth;
        const sqft = (d.lotSF && d.lotSF > 0) ? d.lotSF : rectSqft;

        var elAddr = document.getElementById('ui-address');
        if (elAddr) elAddr.innerText = d.address;
        var elApn = document.getElementById('header-ui-apn');
        if (elApn) elApn.innerText = d.apn;
        document.getElementById('ui-zoning').innerText  = d.zoning;
        document.getElementById('ui-w').innerText       = d.width;
        document.getElementById('ui-d').innerText       = d.depth;
        document.getElementById('ui-sqft').innerText    = sqft.toLocaleString() + ' SF  [' + (sqft / 43560).toFixed(2) + ' AC]';

        document.getElementById('info-address').innerText = d.address;
        document.getElementById('info-apn').innerText     = d.apn;
        document.getElementById('info-zone').innerText    = d.zoning;
        document.getElementById('info-w').innerText       = d.width.toFixed(1) + ' FT';

        this.updateLotSizeDisplay();
        document.getElementById('info-density-lot').innerText   = sqft.toFixed(1) + " S.F.";
        const sd = window.__SITE_DEFAULTS__ || {};
        const baseFAR = sd.baseFAR ?? 2.0;
        const commFAR = sd.commFAR ?? 6.5;
        const maxHt   = sd.maxHeight ?? 50;
        const densPS  = sd.densityPerSF ?? 600;
        const fSb = sd.frontSetback ?? 10, sSb = sd.sideSetback ?? 0, rSb = sd.rearSetback ?? 10;
        document.getElementById('info-buildable-far').innerText = (sqft * baseFAR).toFixed(1) + " S.F.";

        // Dynamic banner stats from site-data
        var elDen = document.getElementById('ui-density');
        if (elDen) elDen.innerText = '1 DU / ' + densPS + ' SF';
        var elFar = document.getElementById('ui-far');
        if (elFar) elFar.innerText = baseFAR + ' / ' + commFAR;
        var elHt  = document.getElementById('ui-maxht');
        if (elHt) elHt.innerText = maxHt + ' FT';
        var elSb  = document.getElementById('ui-setbacks');
        if (elSb) elSb.innerText = fSb + "' / " + sSb + "' / " + rSb + "'";

        // ── Populate dynamic info tables from site-data ──
        var _set = function(id, txt) { var el = document.getElementById(id); if (el) el.innerText = txt; };
        _set('info-height', maxHt > 0 ? maxHt + '.0 FT' : '--');
        _set('info-setbacks', '(F) ' + fSb + '-FT | (R) ' + rSb + '-FT | (S) ' + sSb + '-FT');
        _set('info-max-far', baseFAR > 0 ? baseFAR.toString() : 'N/A');
        _set('info-occupancy', d.zoning || '--');

        // Zoning parameters table
        var zpHdr = document.getElementById('info-zoning-header');
        if (zpHdr) zpHdr.textContent = 'ZONING PARAMETERS (' + (d.zoning || '--') + ')';
        _set('info-zp-density', densPS > 0 ? '1 DU per ' + densPS + ' sq. ft.' : 'Per zoning overlay');
        _set('info-zp-basefar', baseFAR > 0 ? baseFAR.toString() : 'N/A');
        _set('info-zp-commfar', commFAR > 0 ? commFAR + ' FAR' : 'N/A');
        _set('info-zp-maxht', maxHt > 0 ? maxHt + ' Feet' : '--');
        _set('info-zp-front', fSb + ' FT');
        _set('info-zp-rear', rSb + ' FT');
        _set('info-zp-side', sSb + ' FT');
        _set('info-zp-notes', sd.notes || '--');

        // Project info extras
        _set('info-legal',      sd.legalDescription || '--');
        _set('info-year-built', sd.yearBuilt || '--');
        _set('info-occupancy',  sd.occupancyGroup || '--');
        _set('info-sl-projtype', sd.projectType || '--');
        _set('info-sl-architect', sd.architect || '--');

        // Scope of work
        _set('info-scope-work', sd.scopeOfWork || '--');

        // Planning areas (dynamic table)
        var planTable = document.getElementById('info-planning-table');
        if (planTable) {
            var areas = sd.planningAreas || [];
            if (areas.length > 0) {
                planTable.innerHTML = '';
                areas.forEach(function(row) {
                    var tr = document.createElement('tr');
                    var th = document.createElement('th'); th.textContent = (row.name || '').toUpperCase() + ':';
                    var td = document.createElement('td'); td.textContent = row.val || '--';
                    tr.appendChild(th); tr.appendChild(td); planTable.appendChild(tr);
                });
            } else {
                planTable.innerHTML = '<tr><td>No planning data assigned</td></tr>';
            }
        }

        // Overlay zones (dynamic table)
        var overlayTable = document.getElementById('info-overlay-table');
        if (overlayTable) {
            var zones = sd.overlayZones || [];
            if (zones.length > 0) {
                overlayTable.innerHTML = '';
                zones.forEach(function(row) {
                    var tr = document.createElement('tr');
                    var th = document.createElement('th'); th.textContent = (row.name || '').toUpperCase() + ':';
                    var td = document.createElement('td'); td.textContent = row.val || '--';
                    tr.appendChild(th); tr.appendChild(td); overlayTable.appendChild(tr);
                });
            } else {
                overlayTable.innerHTML = '<tr><td>No overlay zones assigned</td></tr>';
            }
        }

        // Inspector contacts (dynamic from site JSON)
        var inspTable = document.getElementById('info-inspectors-table');
        var inspectors = sd.inspectors || [];
        if (inspTable) {
            if (inspectors.length > 0) {
                inspTable.innerHTML = '';
                inspectors.forEach(function(ins) {
                    var tr = document.createElement('tr');
                    var th = document.createElement('th');
                    var td = document.createElement('td');
                    th.textContent = (ins.name || '').toUpperCase() + ':';
                    td.textContent = ins.val || '--';
                    tr.appendChild(th);
                    tr.appendChild(td);
                    inspTable.appendChild(tr);
                });
            } else {
                inspTable.innerHTML = '<tr><td>No inspectors assigned</td></tr>';
            }
        }

        document.getElementById('unitToggleBtn').addEventListener('click', (e) => {
            ConfigEngine.state.unitMode = ConfigEngine.state.unitMode === 'SF' ? 'AC' : 'SF';
            e.target.innerText = ConfigEngine.state.unitMode;
            this.updateLotSizeDisplay();
        });

        this.initBannerDrag();
    },

    updateLotSizeDisplay: function() {
        const d = ConfigEngine.data;
        const sqft = (d.lotSF && d.lotSF > 0) ? d.lotSF : (d.width * d.depth);
        const el   = document.getElementById('info-lotsize');
        el.innerText = ConfigEngine.state.unitMode === 'SF'
            ? sqft.toFixed(1) + " S.F."
            : (sqft / 43560).toFixed(3) + " AC";
    },

    initBannerDrag: function() {
        const banner = document.getElementById('propertyBanner');
        let dragSrc    = null;
        let mergeTimer = null;
        let mergePending = null;
        const self = this;

        function clearMergeState() {
            clearTimeout(mergeTimer);
            mergeTimer = null;
            mergePending = null;
            banner.querySelectorAll('.banner-stat').forEach(s => {
                s.classList.remove('drag-over');
                s.classList.remove('merge-ready');
            });
        }

        function attachHandlers(el) {
            if (el.dataset.dragInit) return;
            el.dataset.dragInit = '1';

            el.addEventListener('dragstart', function(e) {
                dragSrc = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                const ghost = new Image();
                ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                e.dataTransfer.setDragImage(ghost, 0, 0);
            });
            el.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                clearMergeState();
            });
            el.addEventListener('dragover', function(e) {
                e.preventDefault();
                if (this === dragSrc) return;
                e.dataTransfer.dropEffect = 'move';
                // New target — reset timer
                if (mergePending !== this) {
                    clearMergeState();
                    mergePending = this;
                    this.classList.add('drag-over');
                    // After 700 ms hover = merge mode
                    mergeTimer = setTimeout(() => {
                        if (mergePending === this) {
                            this.classList.remove('drag-over');
                            this.classList.add('merge-ready');
                        }
                    }, 700);
                }
            });
            el.addEventListener('drop', function(e) {
                e.stopPropagation();
                if (!dragSrc || dragSrc === this) { clearMergeState(); return; }

                if (this.classList.contains('merge-ready')) {
                    self.mergeCells(dragSrc, this);
                } else {
                    const all = [...banner.querySelectorAll('.banner-stat')];
                    if (all.indexOf(dragSrc) < all.indexOf(this))
                        banner.insertBefore(dragSrc, this.nextSibling);
                    else
                        banner.insertBefore(dragSrc, this);
                }
                clearMergeState();
            });
        }

        banner.querySelectorAll('.banner-stat').forEach(attachHandlers);

        // Double-click a merged cell to split it
        banner.addEventListener('dblclick', function(e) {
            const merged = e.target.closest('.banner-stat.merged');
            if (merged) self.splitCell(merged);
        });
    },

    mergeCells: function(src, target) {
        const banner = document.getElementById('propertyBanner');

        const merged = document.createElement('div');
        merged.className = 'banner-stat merged';
        merged.draggable = true;

        const half1 = document.createElement('div');
        half1.className = 'merge-half';
        while (src.firstChild) half1.appendChild(src.firstChild);

        const sep = document.createElement('div');
        sep.className = 'merge-sep';

        const half2 = document.createElement('div');
        half2.className = 'merge-half';
        while (target.firstChild) half2.appendChild(target.firstChild);

        merged.appendChild(half1);
        merged.appendChild(sep);
        merged.appendChild(half2);

        banner.insertBefore(merged, src);
        banner.removeChild(src);
        banner.removeChild(target);

        // Re-init to attach handlers to the new merged cell
        delete merged.dataset.dragInit;
        this.initBannerDrag();
    },

    splitCell: function(merged) {
        const banner = document.getElementById('propertyBanner');
        const halves = [...merged.querySelectorAll('.merge-half')];

        halves.forEach(half => {
            const stat = document.createElement('div');
            stat.className = 'banner-stat';
            stat.draggable = true;
            while (half.firstChild) stat.appendChild(half.firstChild);
            banner.insertBefore(stat, merged);
        });

        banner.removeChild(merged);
        this.initBannerDrag();
    },

    /* ── SITE INFO EDITOR ─────────────────────────────────────── */
    openSiteEditor: function() {
        var sd = window.__SITE_DEFAULTS__ || {};
        document.getElementById('sei-site-name').textContent = sd.address || sd.siteId || '';
        document.getElementById('sei-legal').value      = sd.legalDescription || '';
        document.getElementById('sei-yearbuilt').value  = sd.yearBuilt || '';
        document.getElementById('sei-occupancy').value  = sd.occupancyGroup || '';
        document.getElementById('sei-projtype').value   = sd.projectType || '';
        document.getElementById('sei-architect').value  = sd.architect || '';
        document.getElementById('sei-scope').value      = sd.scopeOfWork || '';
        document.getElementById('sei-notes').value      = sd.notes || '';
        document.getElementById('sei-status').textContent = '';
        document.getElementById('sei-save-btn').disabled = false;
        this._seiPopulateArray('sei-inspectors', sd.inspectors || [], 'Role', 'Name (Phone)');
        this._seiPopulateArray('sei-planning',   sd.planningAreas || [], 'Label', 'Value');
        this._seiPopulateArray('sei-overlay',    sd.overlayZones || [], 'Zone', 'Yes / No');
        document.getElementById('site-edit-modal').classList.add('open');
    },

    closeSiteEditor: function() {
        document.getElementById('site-edit-modal').classList.remove('open');
    },

    _seiPopulateArray: function(containerId, arr, ph1, ph2) {
        var wrap = document.getElementById(containerId);
        wrap.innerHTML = '';
        arr.forEach(function(item) {
            UIEngine._seiAddRow(containerId, ph1, ph2, item.name || '', item.val || '');
        });
    },

    _seiAddRow: function(containerId, ph1, ph2, name, val) {
        var wrap = document.getElementById(containerId);
        var row  = document.createElement('div');
        row.className = 'sei-array-row';
        var i1 = document.createElement('input'); i1.type = 'text'; i1.placeholder = ph1; i1.value = name || '';
        var i2 = document.createElement('input'); i2.type = 'text'; i2.placeholder = ph2; i2.value = val  || '';
        var btn = document.createElement('button'); btn.className = 'sei-del-row'; btn.textContent = '×';
        btn.onclick = function() { wrap.removeChild(row); };
        row.appendChild(i1); row.appendChild(i2); row.appendChild(btn);
        wrap.appendChild(row);
    },

    _seiReadArray: function(containerId) {
        var rows = document.querySelectorAll('#' + containerId + ' .sei-array-row');
        var result = [];
        rows.forEach(function(row) {
            var inputs = row.querySelectorAll('input');
            var n = (inputs[0].value || '').trim();
            var v = (inputs[1].value || '').trim();
            if (n || v) result.push({ name: n, val: v });
        });
        return result;
    },

    saveSiteInfo: function() {
        var sd = window.__SITE_DEFAULTS__ || {};
        var siteId = sd.siteId;
        if (!siteId) { alert('No active site ID found.'); return; }
        var btn = document.getElementById('sei-save-btn');
        var status = document.getElementById('sei-status');
        btn.disabled = true;
        status.textContent = 'Saving…';
        var payload = {
            legalDescription: document.getElementById('sei-legal').value.trim(),
            yearBuilt:        document.getElementById('sei-yearbuilt').value.trim(),
            occupancyGroup:   document.getElementById('sei-occupancy').value.trim(),
            projectType:      document.getElementById('sei-projtype').value.trim(),
            architect:        document.getElementById('sei-architect').value.trim(),
            scopeOfWork:      document.getElementById('sei-scope').value.trim(),
            notes:            document.getElementById('sei-notes').value.trim(),
            inspectors:       this._seiReadArray('sei-inspectors'),
            planningAreas:    this._seiReadArray('sei-planning'),
            overlayZones:     this._seiReadArray('sei-overlay')
        };
        fetch('/api/sites/' + encodeURIComponent(siteId) + '/update-site', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).then(function(r) { return r.json(); }).then(function(d) {
            if (d.ok) {
                status.textContent = 'Saved! Reloading…';
                setTimeout(function() { location.reload(); }, 800);
            } else {
                status.textContent = 'Error: ' + (d.error || 'unknown');
                btn.disabled = false;
            }
        }).catch(function() {
            // No dev server — download updated JSON with correct structure
            status.textContent = 'No server — downloading updated JSON…';
            btn.disabled = false;
            var sd = window.__SITE_DEFAULTS__ || {};
            // Saved-state fields (managed by ExportEngine._payload) — must NOT go under site
            var savedKeys = ['lat','lng','rotation','locked','setbacks','buildings','activeBuilding',
                             'commFront','showBldgDims','hiddenDimKeys','chainWOffset','chainDOffset',
                             'mapOpacity','setbacksApplied','freeDrag','snapEdge','vehicles','activeVehicle'];
            // Meta-fields injected at build time — not actual site data
            var metaKeys = ['siteId','siteFileName','project'];
            var skipKeys = savedKeys.concat(metaKeys);
            // Build site block from identity fields only
            var siteObj = {};
            Object.keys(sd).forEach(function(k) {
                if (skipKeys.indexOf(k) === -1) { siteObj[k] = sd[k]; }
            });
            // Apply edits from current form
            var editable = ['legalDescription','yearBuilt','occupancyGroup','projectType','architect','scopeOfWork','notes','inspectors','planningAreas','overlayZones'];
            editable.forEach(function(k) { if (payload[k] !== undefined) siteObj[k] = payload[k]; });
            // Rebuild saved block from known saved fields
            var savedObj = {};
            savedKeys.forEach(function(k) { if (sd[k] !== undefined) savedObj[k] = sd[k]; });
            var out = { project: 'ProjectBook-Planner', site: siteObj, saved: savedObj };
            var blob = new Blob([JSON.stringify(out, null, 4)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = sd.siteFileName || (siteId.toLowerCase() + '.json');
            a.click();
            URL.revokeObjectURL(a.href);
            status.textContent = 'Downloaded — replace file in data/sites/ and rebuild.';
        });
    }
};

