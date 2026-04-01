// map-math.js — Pure math extracted from MapEngine (no DOM, no Leaflet)
// Imported by tests and also used internally by MapEngine for consistency.
// DO NOT add browser globals here — this module must run in Node.js (Vitest).

/**
 * Converts a local {x, y} point (feet, lot-centered, rotated) to [lat, lng].
 * @param {{ x: number, y: number }} pt  - Local coordinates in feet
 * @param {{ lat: number, lng: number, rotation: number }} state
 * @returns {[number, number]} [lat, lng]
 */
export function toLatLng(pt, state) {
    const F_LAT = 364566;
    const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
    const rad = state.rotation * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const rx = pt.x * cos - pt.y * sin;
    const ry = pt.x * sin + pt.y * cos;
    return [state.lat + ry / F_LAT, state.lng + rx / F_LNG];
}

/**
 * Converts a Leaflet-style {lat, lng} back to local {x, y} (feet, lot-centered, rotated).
 * @param {{ lat: number, lng: number }} ll
 * @param {{ lat: number, lng: number, rotation: number }} state
 * @returns {{ x: number, y: number }}
 */
export function toLocal(ll, state) {
    const F_LAT = 364566;
    const F_LNG = 365228 * Math.cos(state.lat * Math.PI / 180);
    const rad = state.rotation * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const rx = (ll.lng - state.lng) * F_LNG;
    const ry = (ll.lat - state.lat) * F_LAT;
    return { x: rx * cos + ry * sin, y: -rx * sin + ry * cos };
}
