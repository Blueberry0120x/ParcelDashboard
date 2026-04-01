/**
 * Golden regression tests — Euclid & Westminster sites
 *
 * These tests lock the computed building corner lat/lng values against
 * known-good output from the trusted engine state (captured 2026-04-01).
 *
 * If ANY of these fail it means a change to toLatLng(), toLocal(), or
 * buildingExtents() has altered real map output — investigate before merging.
 *
 * How corners are computed:
 *   Building center (offsetX, offsetY) in lot-local feet  →  rotate by
 *   building orientation  →  add half-extents  →  toLatLng → [lat, lng]
 *
 * Corner order (consistent with engine rendering):
 *   C0 = front-left, C1 = front-right, C2 = rear-right, C3 = rear-left
 */

import { describe, it, expect } from 'vitest'
import { toLatLng } from '../src/js/testable/map-math.js'

// Compute the four lat/lng corners of a building given its center in local coords
function bldgCorners(cx, cy, bldg, state) {
    const hw = bldg.W / 2, hd = bldg.D / 2
    const bRad = bldg.orientation * Math.PI / 180
    const c = Math.cos(bRad), s = Math.sin(bRad)
    const localPts = [
        { x: cx + (-hw * c - (-hd) * s), y: cy + (-hw * s + (-hd) * c) },
        { x: cx + ( hw * c - (-hd) * s), y: cy + ( hw * s + (-hd) * c) },
        { x: cx + ( hw * c - ( hd) * s), y: cy + ( hw * s + ( hd) * c) },
        { x: cx + (-hw * c - ( hd) * s), y: cy + (-hw * s + ( hd) * c) },
    ]
    return localPts.map(pt => toLatLng(pt, state))
}

// ─── EUCLID (ca-4335_Euclid.json) ────────────────────────────────────────────
// Site: 4335 Euclid Ave, San Diego, CA 92105
// Lot: 50 × 125 ft | rotation: 0°
// Building: W=20 D=30 orient=90° at offsetX=-52.5, offsetY=10
const EUCLID_STATE = { lat: 32.755605016287, lng: -117.091946803444, rotation: 0 }
const EUCLID_BLDG  = { W: 20, D: 30, orientation: 90 }
const EUCLID_GOLDEN = [
    [32.755605016, -117.092068893],   // C0 front-left
    [32.755659876, -117.092068893],   // C1 front-right
    [32.755659876, -117.092166565],   // C2 rear-right
    [32.755605016, -117.092166565],   // C3 rear-left
]

describe('Golden regression — Euclid (ca-4335_Euclid)', () => {
    const corners = bldgCorners(-52.5, 10, EUCLID_BLDG, EUCLID_STATE)

    EUCLID_GOLDEN.forEach((expected, i) => {
        it(`corner C${i} lat matches golden`, () => {
            expect(corners[i][0]).toBeCloseTo(expected[0], 6)
        })
        it(`corner C${i} lng matches golden`, () => {
            expect(corners[i][1]).toBeCloseTo(expected[1], 6)
        })
    })
})

// ─── WESTMINSTER (ca-11001_Westminster.json) ──────────────────────────────────
// Site: 11001-11025 Westminster Ave, Garden Grove, CA 92843
// Lot: 155.3 × 109.9 ft | rotation: 90°
// 3 buildings saved
const WM_STATE = { lat: 33.7599881812604, lng: -117.937268257808, rotation: 90 }

const WM_BLDGS = [
    { label: 'B0 (front W=14 D=25 orient=0)',   cx: 5.8,  cy: 70.7,  bldg: { W: 14, D: 25, orientation: 0   } },
    { label: 'B1 (mid   W=14 D=25 orient=0)',   cx: 5.8,  cy: 31.7,  bldg: { W: 14, D: 25, orientation: 0   } },
    { label: 'B2 (rear  W=14 D=25 orient=270)', cx: -13.7, cy: 37.2, bldg: { W: 14, D: 25, orientation: 270 } },
]

const WM_GOLDEN = [
    // B0
    [
        [33.759984890, -117.937459932],
        [33.760023292, -117.937459932],
        [33.760023292, -117.937542266],
        [33.759984890, -117.937542266],
    ],
    // B1
    [
        [33.759984890, -117.937331490],
        [33.760023292, -117.937331490],
        [33.760023292, -117.937413825],
        [33.759984890, -117.937413825],
    ],
    // B2
    [
        [33.759916315, -117.937413825],
        [33.759916315, -117.937367717],
        [33.759984890, -117.937367717],
        [33.759984890, -117.937413825],
    ],
]

describe('Golden regression — Westminster (ca-11001_Westminster)', () => {
    WM_BLDGS.forEach(({ label, cx, cy, bldg }, bi) => {
        const corners = bldgCorners(cx, cy, bldg, WM_STATE)
        WM_GOLDEN[bi].forEach((expected, ci) => {
            it(`${label} C${ci} lat matches golden`, () => {
                expect(corners[ci][0]).toBeCloseTo(expected[0], 6)
            })
            it(`${label} C${ci} lng matches golden`, () => {
                expect(corners[ci][1]).toBeCloseTo(expected[1], 6)
            })
        })
    })
})
