/* ==========================================
   ENGINE 1: CONFIGURATION & STATE
   ========================================== */
const ConfigEngine = {
    data: {
        address: "4335 Euclid Avenue, San Diego, CA 92105",
        apn: "471-271-16-00",
        zoning: "CUPD-CU-2-4",
        width: 50, depth: 125, commercialDepth: 30
    },
    defaults: { lat: 32.755575, lng: -117.091850, rotation: 10.0 },
    cad: {
        projection: "CA_VI_IF",
        proj4Def: "+proj=lcc +lat_1=33.88333333333333 +lat_2=32.78333333333333 +lat_0=32.16666666666666 +lon_0=-116.25 +x_0=2000000 +y_0=500000 +ellps=GRS80 +datum=NAD83 +to_meter=0.3048 +no_defs"
    },

    // Absolute fallback — used only when site-data.json provides no building
    _hardcodedBuilding: { orientation: 0, W: 30, D: 60, offsetX: 0, offsetY: 0, spacing: 0, count: 1, stackSpacing: 0, anchor: 'center', stories: 1, floorHeight: 9 },

    // Source of truth for reset() and addBuilding().
    // Set during init() from site-data.json if available, else _hardcodedBuilding.
    defaultBuilding: null,

    state: {
        lat: 0, lng: 0, rotation: 0,
        isSnapping: false, locked: false, unitMode: 'SF',
        mapOpacity: 70,         // satellite basemap opacity % — auto-saved on change
        setbacksApplied: false,
        setbacks:       { front: 10, rear: 10, sideL: 0, sideR: 0 },
        buildings:      null,   // populated in init()
        activeBuilding: 0,
        commFront:      false,
        showBldgDims:   false
    },
    init: function() {
        const sd    = window.__SITE_DEFAULTS__ || {};         // injected by PS1 from site-data.json

        // Resolve defaultBuilding: site-data.json first building > hardcoded fallback
        const sdBldg = sd.buildings && sd.buildings[0];
        this.defaultBuilding = sdBldg
            ? Object.assign({}, this._hardcodedBuilding, sdBldg)
            : Object.assign({}, this._hardcodedBuilding);

        // Seed state with a fresh copy — never mutate defaultBuilding directly
        this.state.buildings = [ Object.assign({}, this.defaultBuilding) ];

        // Safe localStorage reads — corrupted JSON falls back to null silently
        const _ls = (key) => { try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return null; } };
        const saved = _ls('boundary_location');
        const sLat  = localStorage.getItem('site_lat');
        const sLng  = localStorage.getItem('site_lng');
        const sRot  = localStorage.getItem('site_rot');
        // Priority: localStorage (live session) > site-data.json (PS1 build) > hardcoded defaults
        this.state.lat      = saved ? saved.lat      : (sLat !== null ? parseFloat(sLat) : (sd.lat      ?? this.defaults.lat));
        this.state.lng      = saved ? saved.lng      : (sLng !== null ? parseFloat(sLng) : (sd.lng      ?? this.defaults.lng));
        this.state.rotation = saved ? saved.rotation : (sRot !== null ? parseFloat(sRot) : (sd.rotation ?? this.defaults.rotation));
        if (saved && saved.setbacks) this.state.setbacks = saved.setbacks;
        const storedOpacity = localStorage.getItem('map_opacity');
        if (storedOpacity !== null) this.state.mapOpacity = parseFloat(storedOpacity);
        if      (localStorage.getItem('site_locked') === '1')                     this.state.locked = true;
        else if (localStorage.getItem('site_locked') === null && sd.locked)       this.state.locked = sd.locked;
        const sb   = _ls('saved_setbacks');
        const bldg = _ls('building_config');
        if (sb)             { this.state.setbacks = sb; }
        else if (sd.setbacks) { this.state.setbacks = sd.setbacks; }
        if (bldg) {
            if (bldg.buildings) {
                // New format
                this.state.buildings      = bldg.buildings;
                this.state.activeBuilding = bldg.activeBuilding || 0;
                this.state.commFront      = bldg.commFront      || false;
                this.state.showBldgDims   = bldg.showBldgDims   || false;
                this.state.hiddenDimKeys  = bldg.hiddenDimKeys  || [];
                this.state.chainWOffset   = bldg.chainWOffset   ?? 0;
                this.state.chainDOffset   = bldg.chainDOffset   ?? 0;
                // Migrate older builds: stories/floorHeight + old width/height keys → W/D
                const mStories = bldg.stories || 1, mFloorH = bldg.floorHeight || 9;
                this.state.buildings.forEach(b => {
                    if (!('stories'     in b)) b.stories     = mStories;
                    if (!('floorHeight' in b)) b.floorHeight = mFloorH;
                    if (!('W' in b) && 'width'  in b) { b.W = b.width;  delete b.width;  }
                    if (!('D' in b) && 'height' in b) { b.D = b.height; delete b.height; }
                });
            } else if (bldg.W || bldg.width) {
                // Migrate old single-object format
                this.state.buildings = [{ orientation: bldg.orientation || 0, W: bldg.W || bldg.width, D: bldg.D || bldg.height, offsetX: bldg.offsetX || 0, offsetY: bldg.offsetY || 0, spacing: 0, count: 1, stackSpacing: 0, anchor: 'center', stories: bldg.stories || 1, floorHeight: 9 }];
                this.state.commFront = bldg.commFront || false;
            }
        } else if (sd.buildings) {
            this.state.buildings      = sd.buildings;
            this.state.activeBuilding = sd.activeBuilding || 0;
            this.state.commFront      = sd.commFront      || false;
            this.state.showBldgDims   = sd.showBldgDims   || false;
            this.state.hiddenDimKeys  = sd.hiddenDimKeys  || [];
            this.state.chainWOffset   = sd.chainWOffset   ?? 0;
            this.state.chainDOffset   = sd.chainDOffset   ?? 0;
            if (sd.mapOpacity != null) this.state.mapOpacity = sd.mapOpacity;
            // Migrate older site-data lacking per-building stories/floorHeight
            const mStories = sd.stories || 1, mFloorH = sd.floorHeight || 9;
            this.state.buildings.forEach(b => {
                if (!('stories'     in b)) b.stories     = mStories;
                if (!('floorHeight' in b)) b.floorHeight = mFloorH;
            });
        }
    },
    save: function() {
        localStorage.setItem('site_lat', this.state.lat);
        localStorage.setItem('site_lng', this.state.lng);
        localStorage.setItem('site_rot', this.state.rotation);
    },
    reset: function() {
        localStorage.removeItem('site_lat');
        localStorage.removeItem('site_lng');
        localStorage.removeItem('site_rot');
        localStorage.removeItem('boundary_location');
        this.state.lat      = this.defaults.lat;
        this.state.lng      = this.defaults.lng;
        this.state.rotation = this.defaults.rotation;
        this.state.locked         = false;
        this.state.setbacks       = { front: 10, rear: 10, sideL: 0, sideR: 0 };
        this.state.buildings      = [ Object.assign({}, this.defaultBuilding) ];
        this.state.activeBuilding = 0;
        this.state.commFront        = false;
        this.state.showBldgDims     = false;
        this.state.setbacksApplied  = false;
        localStorage.removeItem('saved_setbacks');
        localStorage.removeItem('building_config');
        localStorage.removeItem('site_locked');
        // Note: pushToServer() is called by the button handler AFTER MapEngine is also cleaned up
    }
};

