/* ==========================================
   ENGINE 1: CONFIGURATION & STATE
   ========================================== */
const ConfigEngine = {
    data: {
        address: "4335 Euclid Avenue, City Heights, San Diego, CA 92105",
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
        isSnapping: false, unitMode: 'SF', mode: 'complex',
        setbacksApplied: false,
        setbacks: { front: 10, rear: 10, sideL: 0, sideR: 0 }
    },
    init: function() {
        this.state.lat      = parseFloat(localStorage.getItem('site_lat')) || this.defaults.lat;
        this.state.lng      = parseFloat(localStorage.getItem('site_lng')) || this.defaults.lng;
        this.state.rotation = parseFloat(localStorage.getItem('site_rot')) || this.defaults.rotation;
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
        this.state.lat      = this.defaults.lat;
        this.state.lng      = this.defaults.lng;
        this.state.rotation = this.defaults.rotation;
    }
};
