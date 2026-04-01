import { describe, it, expect } from 'vitest'
import { toLatLng, toLocal } from '../src/js/testable/map-math.js'

// Reference state — matches a typical CA site (San Diego area)
const STATE_CA = { lat: 32.715, lng: -117.157, rotation: 0 }
const STATE_ROT = { lat: 32.715, lng: -117.157, rotation: 30 }
const STATE_WA = { lat: 47.490, lng: -122.339, rotation: 0 }

describe('MapEngine — toLatLng / toLocal round-trip (Frame contract V1)', () => {

    it('round-trips origin at rotation=0', () => {
        const pt = { x: 0, y: 0 }
        const ll = toLatLng(pt, STATE_CA)
        const back = toLocal({ lat: ll[0], lng: ll[1] }, STATE_CA)
        expect(back.x).toBeCloseTo(pt.x, 4)
        expect(back.y).toBeCloseTo(pt.y, 4)
    })

    it('round-trips a non-zero point at rotation=0', () => {
        const pt = { x: 25, y: -40 }
        const ll = toLatLng(pt, STATE_CA)
        const back = toLocal({ lat: ll[0], lng: ll[1] }, STATE_CA)
        expect(back.x).toBeCloseTo(pt.x, 2)
        expect(back.y).toBeCloseTo(pt.y, 2)
    })

    it('round-trips under 30° rotation', () => {
        const pt = { x: 15, y: -30 }
        const ll = toLatLng(pt, STATE_ROT)
        const back = toLocal({ lat: ll[0], lng: ll[1] }, STATE_ROT)
        expect(back.x).toBeCloseTo(pt.x, 2)
        expect(back.y).toBeCloseTo(pt.y, 2)
    })

    it('round-trips a WA site (different lat → different F_LNG)', () => {
        const pt = { x: -9.1, y: -32 }
        const ll = toLatLng(pt, STATE_WA)
        const back = toLocal({ lat: ll[0], lng: ll[1] }, STATE_WA)
        expect(back.x).toBeCloseTo(pt.x, 2)
        expect(back.y).toBeCloseTo(pt.y, 2)
    })

    it('toLatLng moves north when y > 0', () => {
        const ll = toLatLng({ x: 0, y: 100 }, STATE_CA)  // 100 ft north
        expect(ll[0]).toBeGreaterThan(STATE_CA.lat)
        expect(ll[1]).toBeCloseTo(STATE_CA.lng, 5)        // no east movement
    })

    it('toLatLng moves east when x > 0', () => {
        const ll = toLatLng({ x: 100, y: 0 }, STATE_CA)  // 100 ft east
        expect(ll[1]).toBeGreaterThan(STATE_CA.lng)
        expect(ll[0]).toBeCloseTo(STATE_CA.lat, 5)        // no north movement
    })

    it('rotation=90 swaps x/y axes', () => {
        const state90 = { ...STATE_CA, rotation: 90 }
        // At 90°: x=100 becomes pure south (negative lat), y stays near origin
        const ll = toLatLng({ x: 100, y: 0 }, state90)
        expect(ll[0]).toBeGreaterThan(STATE_CA.lat)   // sin(90)*x positive → north
    })

    it('F_LNG scales with latitude (WA wider than CA in degrees)', () => {
        // At higher latitude, same foot distance = larger degree change in lng
        const ptE = { x: 100, y: 0 }
        const llCA = toLatLng(ptE, STATE_CA)
        const llWA = toLatLng(ptE, STATE_WA)
        const deltaCA = Math.abs(llCA[1] - STATE_CA.lng)
        const deltaWA = Math.abs(llWA[1] - STATE_WA.lng)
        // WA is ~47° lat, CA is ~33° lat — cos(47) < cos(33) so WA lng delta > CA
        expect(deltaWA).toBeGreaterThan(deltaCA)
    })
})
