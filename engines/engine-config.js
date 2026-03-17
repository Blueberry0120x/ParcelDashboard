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
    state: {
        lat: 0, lng: 0, rotation: 0,
        isSnapping: false, locked: false, unitMode: 'SF', mode: 'complex',
        setbacksApplied: false,
        setbacks:       { front: 10, rear: 10, sideL: 0, sideR: 0 },
        buildings:      [{ orientation: 0, width: 30, height: 60, offsetX: 0, offsetY: 0, spacing: 0, count: 1, stackSpacing: 0, anchor: 'center' }],
        activeBuilding: 0,
        stories:        1,
        floorHeight:    9,
        commFront:      false
    },
    init: function() {
        const saved = JSON.parse(localStorage.getItem('boundary_location') || 'null');
        const sLat  = localStorage.getItem('site_lat');
        const sLng  = localStorage.getItem('site_lng');
        const sRot  = localStorage.getItem('site_rot');
        this.state.lat      = saved ? saved.lat      : (sLat !== null ? parseFloat(sLat) : this.defaults.lat);
        this.state.lng      = saved ? saved.lng      : (sLng !== null ? parseFloat(sLng) : this.defaults.lng);
        this.state.rotation = saved ? saved.rotation : (sRot !== null ? parseFloat(sRot) : this.defaults.rotation);
        if (saved && saved.setbacks) this.state.setbacks = saved.setbacks;
        if (localStorage.getItem('site_locked') === '1') this.state.locked = true;
        const sb   = JSON.parse(localStorage.getItem('saved_setbacks')  || 'null');
        const bldg = JSON.parse(localStorage.getItem('building_config') || 'null');
        if (sb) this.state.setbacks = sb;
        if (bldg) {
            if (bldg.buildings) {
                // New format
                this.state.buildings      = bldg.buildings;
                this.state.activeBuilding = bldg.activeBuilding || 0;
                this.state.stories        = bldg.stories     || 1;
                this.state.floorHeight    = bldg.floorHeight || 9;
                this.state.commFront      = bldg.commFront   || false;
            } else if (bldg.width) {
                // Migrate old single-object format
                this.state.buildings  = [{ orientation: bldg.orientation || 0, width: bldg.width, height: bldg.height, offsetX: bldg.offsetX || 0, offsetY: bldg.offsetY || 0 }];
                this.state.stories    = bldg.stories   || 1;
                this.state.commFront  = bldg.commFront || false;
            }
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
        this.state.locked   = false;
        this.state.setbacks       = { front: 10, rear: 10, sideL: 0, sideR: 0 };
        this.state.buildings      = [{ orientation: 0, width: 30, height: 60, offsetX: 0, offsetY: 0, spacing: 0, count: 1, stackSpacing: 0, anchor: 'center' }];
        this.state.activeBuilding = 0;
        this.state.stories        = 1;
        this.state.floorHeight    = 9;
        this.state.commFront      = false;
        localStorage.removeItem('saved_setbacks');
        localStorage.removeItem('building_config');
    }
};
