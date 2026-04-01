import { describe, it, expect } from 'vitest'
import { buildingExtents, clampToLot } from '../src/js/testable/setback-math.js'

const SIMPLE_BLDG = { W: 30, D: 40, orientation: 0, count: 1, stackSpacing: 0, stackAngle: 0, anchor: 'center' }
const LOT_100x100 = { lotW: 100, lotD: 100 }

describe('SetbackEngine — buildingExtents (Frame contract V2)', () => {

    it('axis-aligned building: halfWidth = W/2, halfDepth = D/2', () => {
        const ext = buildingExtents({ W: 30, D: 40, orientation: 0 })
        expect(ext.halfWidth).toBeCloseTo(15, 6)
        expect(ext.halfDepth).toBeCloseTo(20, 6)
    })

    it('90° rotation swaps width and depth', () => {
        const ext = buildingExtents({ W: 30, D: 40, orientation: 90 })
        expect(ext.halfWidth).toBeCloseTo(20, 4)   // D/2 becomes halfWidth
        expect(ext.halfDepth).toBeCloseTo(15, 4)   // W/2 becomes halfDepth
    })

    it('45° rotation: halfWidth = halfDepth = (W+D)/2 * sin45', () => {
        const ext = buildingExtents({ W: 30, D: 30, orientation: 45 })
        const expected = (30 / 2) * (Math.SQRT2)   // ≈ 21.21
        expect(ext.halfWidth).toBeCloseTo(expected, 2)
        expect(ext.halfDepth).toBeCloseTo(expected, 2)
    })

    it('extents are always positive regardless of orientation sign', () => {
        for (const deg of [-90, -45, -30, 0, 30, 45, 90, 135, 180]) {
            const ext = buildingExtents({ W: 20, D: 50, orientation: deg })
            expect(ext.halfWidth).toBeGreaterThan(0)
            expect(ext.halfDepth).toBeGreaterThan(0)
        }
    })

    it('square building: extents equal at any orientation', () => {
        for (const deg of [0, 15, 30, 45, 60, 75, 90]) {
            const ext = buildingExtents({ W: 30, D: 30, orientation: deg })
            expect(ext.halfWidth).toBeCloseTo(ext.halfDepth, 6)
        }
    })
})

describe('SetbackEngine — clampToLot (building stays inside lot)', () => {

    it('center of lot: no clamping needed', () => {
        const result = clampToLot(0, 0, SIMPLE_BLDG, LOT_100x100)
        expect(result.cx).toBeCloseTo(0, 6)
        expect(result.cy).toBeCloseTo(0, 6)
    })

    it('clamps building pushed too far east (cx too large)', () => {
        const result = clampToLot(60, 0, SIMPLE_BLDG, LOT_100x100)
        // At orientation=0: halfDepth (D/2=20) bounds X, halfWidth (W/2=15) bounds Y
        // max cx = lotW/2 - halfDepth = 50 - 20 = 30
        expect(result.cx).toBeCloseTo(30, 2)
        expect(result.cy).toBeCloseTo(0, 2)
    })

    it('clamps building pushed too far north (cy too large)', () => {
        const result = clampToLot(0, 60, SIMPLE_BLDG, LOT_100x100)
        // max cy = lotD/2 - halfWidth = 50 - 15 = 35
        expect(result.cy).toBeCloseTo(35, 2)
    })

    it('clamps in both axes simultaneously', () => {
        const result = clampToLot(80, 80, SIMPLE_BLDG, LOT_100x100)
        expect(result.cx).toBeCloseTo(30, 2)
        expect(result.cy).toBeCloseTo(35, 2)
    })

    it('building always fits within lot after clamping', () => {
        const positions = [
            [0,0], [100,0], [-100,0], [0,100], [0,-100], [75,75], [-80,-80]
        ]
        for (const [cx, cy] of positions) {
            const result = clampToLot(cx, cy, SIMPLE_BLDG, LOT_100x100)
            // halfDepth bounds X, halfWidth bounds Y (convention at orientation=0)
            const { halfDepth, halfWidth } = buildingExtents(SIMPLE_BLDG)
            expect(Math.abs(result.cx) + halfDepth).toBeLessThanOrEqual(LOT_100x100.lotW / 2 + 0.001)
            expect(Math.abs(result.cy) + halfWidth).toBeLessThanOrEqual(LOT_100x100.lotD / 2 + 0.001)
        }
    })

    it('2-building stack clamps the full array footprint', () => {
        const stack2 = { W: 30, D: 40, orientation: 0, count: 2, stackSpacing: 2, stackAngle: 90, anchor: 'center' }
        const result = clampToLot(0, 200, stack2, LOT_100x100)
        // Stack extends further in Y — clamped cy must be less than single-bldg clamp
        const single = clampToLot(0, 200, SIMPLE_BLDG, LOT_100x100)
        expect(Math.abs(result.cy)).toBeLessThanOrEqual(Math.abs(single.cy))
    })
})
