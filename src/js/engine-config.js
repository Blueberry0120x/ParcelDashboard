/* ==========================================
   ENGINE 1: CONFIGURATION & STATE
   ========================================== */
const ConfigEngine = {
    data: {
        address: "4335 Euclid Avenue, San Diego, CA 92105",
        apn: "471-271-16-00",
        zoning: "CUPD-CU-2-4",
        width: 50, depth: 125, commercialDepth: 30, lotSF: 0
    },
    defaults: { lat: 32.755575, lng: -117.091850, rotation: 10.0 },
    // Coordinate system library — keyed by state/zone
    CAD_SYSTEMS: {
        "CA_VI":   { label: "CA State Plane VI (San Diego)",  projection: "CA_VI_IF",   proj4Def: "+proj=lcc +lat_1=33.88333333333333 +lat_2=32.78333333333333 +lat_0=32.16666666666666 +lon_0=-116.25 +x_0=2000000 +y_0=500000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048 +no_defs" },
        "CA_V":    { label: "CA State Plane V (LA/OC)",       projection: "CA_V_IF",    proj4Def: "+proj=lcc +lat_1=35.46666666666667 +lat_2=34.03333333333333 +lat_0=33.5 +lon_0=-118.0 +x_0=2000000 +y_0=500000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048 +no_defs" },
        "CA_IV":   { label: "CA State Plane IV (Fresno)",     projection: "CA_IV_IF",   proj4Def: "+proj=lcc +lat_1=37.25 +lat_2=36.0 +lat_0=35.33333333333334 +lon_0=-119.0 +x_0=2000000 +y_0=500000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048 +no_defs" },
        "CA_III":  { label: "CA State Plane III (Sac/SF)",    projection: "CA_III_IF",  proj4Def: "+proj=lcc +lat_1=38.43333333333333 +lat_2=37.06666666666667 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000 +y_0=500000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048 +no_defs" },
        "WA_N":    { label: "WA State Plane North (Seattle)", projection: "WA_N_IF",    proj4Def: "+proj=lcc +lat_1=48.73333333333333 +lat_2=47.5 +lat_0=47.0 +lon_0=-120.8333333333333 +x_0=500000 +y_0=0 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs" },
        "WA_S":    { label: "WA State Plane South (Olympia)", projection: "WA_S_IF",    proj4Def: "+proj=lcc +lat_1=47.33333333333334 +lat_2=45.83333333333334 +lat_0=45.33333333333334 +lon_0=-120.5 +x_0=500000 +y_0=0 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048006096012192 +no_defs" },
    },
    cad: {
        projection: "CA_VI_IF",
        proj4Def: "+proj=lcc +lat_1=33.88333333333333 +lat_2=32.78333333333333 +lat_0=32.16666666666666 +lon_0=-116.25 +x_0=2000000 +y_0=500000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048 +no_defs"
    },

    // Absolute fallback -- used only when site-data.json provides no building
    _hardcodedBuilding: { orientation: 0, W: 30, D: 60, offsetX: 0, offsetY: 0, spacing: 0, count: 1, stackSpacing: 0, anchor: 'center', stories: 1, floorHeight: 9 },

    // Source of truth for reset() and addBuilding().
    // Set during init() from site-data.json if available, else _hardcodedBuilding.
    defaultBuilding: null,

    state: {
        lat: 0, lng: 0, rotation: 0,
        isSnapping: false, locked: false, unitMode: 'SF',
        mapOpacity: 70,
        setbacksApplied: false,
        freeDrag:       true,
        snapEdge:       true,
        setbacks:       { front: 10, rear: 10, sideL: 0, sideR: 0 },
        buildings:      null,
        activeBuilding: 0,
        commFront:      false,
        showBldgDims:   false,
        vehicles:       [],
        activeVehicle:  -1
    },
    init: function() {
        var sd = window.__SITE_DEFAULTS__ || {};

        // Override site identity from site-data.json.site if available
        if (sd.address)         this.data.address         = sd.address;
        if (sd.apn)             this.data.apn             = sd.apn;
        if (sd.zoning)          this.data.zoning          = sd.zoning;
        if (typeof sd.lotWidth !== 'undefined')  this.data.width = sd.lotWidth;
        if (typeof sd.lotDepth !== 'undefined')  this.data.depth = sd.lotDepth;
        if (sd.commercialDepth != null) this.data.commercialDepth = sd.commercialDepth;
        if (sd.lotSF != null)   this.data.lotSF           = sd.lotSF;
        if (sd.parcelPolygon)   this.data.parcelPolygon   = sd.parcelPolygon;
        if (sd.siteId)          this.data.siteId          = sd.siteId;

        // Set coordinate system from site config or auto-detect from address
        var cadZone = sd.cadZone || this._detectCadZone(sd.address || this.data.address);
        if (cadZone && this.CAD_SYSTEMS[cadZone]) {
            var sys = this.CAD_SYSTEMS[cadZone];
            this.cad.projection = sys.projection;
            this.cad.proj4Def   = sys.proj4Def;
            this.data.cadZone   = cadZone;
        }

        // Resolve defaultBuilding: site-data.json first building > hardcoded fallback
        var sdBldg = sd.buildings && sd.buildings[0];
        this.defaultBuilding = sdBldg
            ? Object.assign({}, this._hardcodedBuilding, sdBldg)
            : Object.assign({}, this._hardcodedBuilding);

        // Seed state with a fresh copy
        this.state.buildings = [ Object.assign({}, this.defaultBuilding) ];

        // ── Load saved state: ONE localStorage key > __SITE_DEFAULTS__ > defaults ──
        var stored = null;
        try { stored = JSON.parse(localStorage.getItem('site_state')); } catch(e) {}
        // Clear localStorage if site changed (multi-site switch)
        if (stored && this.data.siteId && stored.siteId !== this.data.siteId) {
            localStorage.removeItem('site_state');
            stored = null;
        }
        var saved = stored ? stored.saved : null;

        // Migration: check old keys if no unified state exists yet
        if (!saved) {
            saved = this._migrateOldKeys();
        }

        if (saved) {
            this.state.lat            = saved.lat            ?? this.defaults.lat;
            this.state.lng            = saved.lng            ?? this.defaults.lng;
            this.state.rotation       = saved.rotation       ?? this.defaults.rotation;
            this.state.locked         = saved.locked         ?? false;
            this.state.setbacks       = saved.setbacks       ?? { front: 10, rear: 10, sideL: 0, sideR: 0 };
            this.state.commFront      = saved.commFront      ?? false;
            this.state.showBldgDims   = saved.showBldgDims   ?? false;
            this.state.hiddenDimKeys  = saved.hiddenDimKeys  ?? [];
            this.state.chainWOffset   = saved.chainWOffset   ?? 0;
            this.state.chainDOffset   = saved.chainDOffset   ?? 0;
            this.state.mapOpacity     = saved.mapOpacity     ?? 70;
            this.state.setbacksApplied = saved.setbacksApplied ?? false;
            this.state.freeDrag       = saved.freeDrag       ?? true;
            this.state.snapEdge       = saved.snapEdge       ?? true;
            if (saved.buildings && saved.buildings.length) {
                this.state.buildings      = saved.buildings;
                this.state.activeBuilding = saved.activeBuilding ?? 0;
            }
            if (saved.vehicles) {
                this.state.vehicles      = saved.vehicles;
                this.state.activeVehicle = saved.activeVehicle ?? -1;
            }
        } else {
            // Fall back to __SITE_DEFAULTS__
            this.state.lat      = sd.lat      ?? this.defaults.lat;
            this.state.lng      = sd.lng      ?? this.defaults.lng;
            this.state.rotation = sd.rotation ?? this.defaults.rotation;
            this.state.locked   = sd.locked   ?? false;
            if (sd.setbacks) this.state.setbacks = sd.setbacks;
            if (sd.buildings) {
                this.state.buildings      = sd.buildings;
                this.state.activeBuilding = sd.activeBuilding ?? 0;
                this.state.commFront      = sd.commFront      ?? false;
                this.state.showBldgDims   = sd.showBldgDims   ?? false;
                this.state.hiddenDimKeys  = sd.hiddenDimKeys  ?? [];
                this.state.chainWOffset   = sd.chainWOffset   ?? 0;
                this.state.chainDOffset   = sd.chainDOffset   ?? 0;
            }
            if (sd.mapOpacity != null) this.state.mapOpacity = sd.mapOpacity;
        }

        // Migrate older builds: ensure per-building stories/floorHeight + W/D keys
        this.state.buildings.forEach(function(b) {
            if (!('stories'     in b)) b.stories     = 1;
            if (!('floorHeight' in b)) b.floorHeight = 9;
            if (!('W' in b) && 'width'  in b) { b.W = b.width;  delete b.width;  }
            if (!('D' in b) && 'height' in b) { b.D = b.height; delete b.height; }
        });
    },

    // One-time migration from scattered old localStorage keys -> returns saved-shaped object or null
    _migrateOldKeys: function() {
        var _ls = function(key) { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } };
        var boundary = _ls('boundary_location');
        var bldg     = _ls('building_config');
        var sb       = _ls('saved_setbacks');
        var sLat     = localStorage.getItem('site_lat');
        var sLng     = localStorage.getItem('site_lng');
        var sRot     = localStorage.getItem('site_rot');
        var opacity  = localStorage.getItem('map_opacity');
        var locked   = localStorage.getItem('site_locked');

        // If nothing exists in old keys, return null
        if (!boundary && !bldg && !sb && sLat === null) return null;

        var saved = {};
        saved.lat      = boundary ? boundary.lat      : (sLat !== null ? parseFloat(sLat) : null);
        saved.lng      = boundary ? boundary.lng      : (sLng !== null ? parseFloat(sLng) : null);
        saved.rotation = boundary ? boundary.rotation : (sRot !== null ? parseFloat(sRot) : null);
        saved.locked   = locked === '1';
        saved.setbacks = sb || (boundary ? boundary.setbacks : null);
        saved.mapOpacity = opacity !== null ? parseFloat(opacity) : null;

        if (bldg && bldg.buildings) {
            saved.buildings      = bldg.buildings;
            saved.activeBuilding = bldg.activeBuilding || 0;
            saved.commFront      = bldg.commFront      || false;
            saved.showBldgDims   = bldg.showBldgDims   || false;
            saved.hiddenDimKeys  = bldg.hiddenDimKeys  || [];
            saved.chainWOffset   = bldg.chainWOffset   ?? 0;
            saved.chainDOffset   = bldg.chainDOffset   ?? 0;
        } else if (bldg && (bldg.W || bldg.width)) {
            saved.buildings = [{ orientation: bldg.orientation || 0, W: bldg.W || bldg.width, D: bldg.D || bldg.height, offsetX: bldg.offsetX || 0, offsetY: bldg.offsetY || 0, spacing: 0, count: 1, stackSpacing: 0, anchor: 'center', stories: bldg.stories || 1, floorHeight: 9 }];
            saved.commFront = bldg.commFront || false;
        }

        // Clean up old keys now that we've migrated
        ['boundary_location','building_config','saved_setbacks','site_lat','site_lng','site_rot','map_opacity','site_locked'].forEach(function(k) {
            localStorage.removeItem(k);
        });

        return saved;
    },

    // Auto-detect CAD zone from address string
    _detectCadZone: function(addr) {
        if (!addr) return null;
        var a = addr.toUpperCase();
        // San Diego County
        if (a.indexOf('SAN DIEGO') > -1 || /\b921\d{2}\b/.test(a)) return 'CA_VI';
        // Orange County / LA County
        if (a.indexOf('GARDEN GROVE') > -1 || a.indexOf('ANAHEIM') > -1 ||
            a.indexOf('SANTA ANA') > -1 || a.indexOf('IRVINE') > -1 ||
            a.indexOf('LOS ANGELES') > -1 || a.indexOf('LONG BEACH') > -1 ||
            /\b926\d{2}\b/.test(a) || /\b928\d{2}\b/.test(a) ||
            /\b900\d{2}\b/.test(a) || /\b906\d{2}\b/.test(a)) return 'CA_V';
        // WA - Seattle / King County area
        if (a.indexOf('SEATTLE') > -1 || a.indexOf('BURIEN') > -1 ||
            a.indexOf('BELLEVUE') > -1 || a.indexOf('TACOMA') > -1 ||
            /\b981\d{2}\b/.test(a) || /\b980\d{2}\b/.test(a)) return 'WA_N';
        return null;
    },

    reset: function() {
        localStorage.removeItem('site_state');
        this.state.lat              = this.defaults.lat;
        this.state.lng              = this.defaults.lng;
        this.state.rotation         = this.defaults.rotation;
        this.state.locked           = false;
        this.state.setbacks         = { front: 10, rear: 10, sideL: 0, sideR: 0 };
        this.state.buildings        = [ Object.assign({}, this.defaultBuilding) ];
        this.state.activeBuilding   = 0;
        this.state.commFront        = false;
        this.state.showBldgDims     = false;
        this.state.setbacksApplied  = false;
        this.state.mapOpacity       = 70;
        this.state.hiddenDimKeys    = [];
        this.state.chainWOffset     = 0;
        this.state.chainDOffset     = 0;
        this.state.vehicles         = [];
        this.state.activeVehicle    = -1;
    },

    // When parcelPolygon exists, snap state.lat/lng to its centroid.
    // Call this at the start of any render that uses state.lat/lng for positioning.
    snapToPolygonCentroid: function() {
        var pp = this.data.parcelPolygon;
        if (!pp || pp.length < 3) return;
        var n = pp.length;
        if (pp[n-1][0] === pp[0][0] && pp[n-1][1] === pp[0][1]) n--;
        var sLat = 0, sLng = 0;
        for (var i = 0; i < n; i++) { sLat += pp[i][0]; sLng += pp[i][1]; }
        this.state.lat = sLat / n;
        this.state.lng = sLng / n;
    }
};
