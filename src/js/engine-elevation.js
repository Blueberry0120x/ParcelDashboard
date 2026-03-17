/* ==========================================
   ELEVATION TOOL
   ========================================== */
const ElevationTool = {
    _pins:     [],
    _hoverDiv: null,
    _debounce: null,
    _sampling: false,
    _cache:    {},

    init: function() {
        document.getElementById('elevToggleBtn').addEventListener('click', () => this._toggle());
        document.getElementById('elevSampleBtn').addEventListener('click', () => this._startSample());
        document.getElementById('elevClearBtn' ).addEventListener('click', () => this.clear());

        this._hoverDiv = document.createElement('div');
        this._hoverDiv.className = 'elev-hover';
        document.body.appendChild(this._hoverDiv);
    },

    _toggle: function() {
        const tools = document.getElementById('elevTools');
        const btn   = document.getElementById('elevToggleBtn');
        const open  = tools.classList.toggle('open');
        btn.classList.toggle('open', open);
        if (!open) this._deactivate();
    },

    _startSample: function() {
        if (this._sampling) return;
        this._sampling = true;
        document.getElementById('elevSampleBtn').classList.add('active');
        MapEngine.map.getContainer().style.cursor = 'crosshair';
        MapEngine.map.on('mousemove', this._onMove, this);
        MapEngine.map.on('click',     this._onClick, this);
    },

    _onMove: function(e) {
        const mx = e.originalEvent.clientX, my = e.originalEvent.clientY;
        this._hoverDiv.style.left    = (mx + 14) + 'px';
        this._hoverDiv.style.top     = (my - 34) + 'px';
        this._hoverDiv.style.display = 'block';
        this._hoverDiv.textContent   = '…';
        clearTimeout(this._debounce);
        this._debounce = setTimeout(() => {
            this._fetch(e.latlng.lat, e.latlng.lng).then(elev => {
                this._hoverDiv.textContent = elev !== null ? elev + ' ft' : 'N/A';
            });
        }, 80);
    },

    _onClick: function(e) {
        this._fetch(e.latlng.lat, e.latlng.lng).then(elev => {
            const label = elev !== null ? elev + ' ft' : 'N/A';
            const pin = L.circleMarker(e.latlng, {
                radius: 5, color: '#0f4c81', weight: 2,
                fillColor: '#ffffff', fillOpacity: 1
            }).bindTooltip(label, {
                permanent: true, direction: 'top',
                offset: [0, -6], className: 'elev-label'
            }).addTo(MapEngine.map);
            this._pins.push(pin);
        });
    },

    clear: function() {
        this._pins.forEach(p => MapEngine.map.removeLayer(p));
        this._pins = [];
        this._deactivate();
    },

    _deactivate: function() {
        this._sampling = false;
        MapEngine.map.off('mousemove', this._onMove, this);
        MapEngine.map.off('click',     this._onClick, this);
        MapEngine.map.getContainer().style.cursor = '';
        this._hoverDiv.style.display = 'none';
        const btn = document.getElementById('elevSampleBtn');
        if (btn) btn.classList.remove('active');
    },

    _fetch: function(lat, lng) {
        const key = lat.toFixed(4) + ',' + lng.toFixed(4);
        if (this._cache[key] !== undefined) return Promise.resolve(this._cache[key]);

        const url = 'https://epqs.nationalmap.gov/v1/json?x=' + lng + '&y=' + lat + '&wkid=4326&units=Feet&includeDate=false';
        return fetch(url)
            .then(function(r) { return r.json(); })
            .then((d) => {
                const v = parseFloat(d.value);
                const result = isNaN(v) ? null : v.toFixed(1);
                this._cache[key] = result;
                return result;
            })
            .catch(function() { return null; });
    }
};

