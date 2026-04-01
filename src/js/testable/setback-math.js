// setback-math.js — Pure math extracted from SetbackEngine (no DOM, no ConfigEngine)
// Imported by tests and also used internally by SetbackEngine for consistency.
// DO NOT add browser globals here — this module must run in Node.js (Vitest).

/**
 * Returns axis-aligned bounding half-extents for a building at its orientation.
 * @param {{ W: number, D: number, orientation: number }} bldg
 * @returns {{ halfDepth: number, halfWidth: number }}
 */
export function buildingExtents(bldg) {
    const hw   = bldg.W / 2, hh = bldg.D / 2;
    const bRad = bldg.orientation * Math.PI / 180;
    const aC   = Math.abs(Math.cos(bRad)), aS = Math.abs(Math.sin(bRad));
    return {
        halfDepth: hh * aC + hw * aS,
        halfWidth: hh * aS + hw * aC
    };
}

/**
 * Clamps a building center (cx, cy) so it stays within a rectangular lot.
 * Returns { cx, cy } clamped to lot bounds.
 * Note: polygon-parcel clamping is browser-only (needs ConfigEngine.state).
 *       This pure version handles the rectangular case only.
 *
 * @param {number} cx - Requested center X (feet)
 * @param {number} cy - Requested center Y (feet)
 * @param {{ W: number, D: number, orientation: number,
 *            count?: number, stackSpacing?: number,
 *            stackAngle?: number, anchor?: string }} bldg
 * @param {{ lotW: number, lotD: number }} lot - Lot dimensions in feet
 * @returns {{ cx: number, cy: number }}
 */
export function clampToLot(cx, cy, bldg, lot) {
    const count        = bldg.count        || 1;
    const stackSpacing = bldg.stackSpacing || 0;
    const stackAngle   = bldg.stackAngle   || 0;
    const anchor       = bldg.anchor       || 'center';
    const hw   = bldg.W / 2, hh = bldg.D / 2;
    const bRad = bldg.orientation * Math.PI / 180;
    const bCos = Math.cos(bRad), bSin = Math.sin(bRad);
    const { halfDepth, halfWidth } = buildingExtents(bldg);

    const sAngRad   = stackAngle * Math.PI / 180;
    const sDirX     = Math.cos(sAngRad);
    const sDirY     = Math.sin(sAngRad);
    const halfInDir = Math.abs(hh * (bCos * sDirX + bSin * sDirY)) +
                      Math.abs(hw * (-bSin * sDirX + bCos * sDirY));
    const step = halfInDir * 2 + stackSpacing;
    const aOff = anchor === 'front' ? 0 : anchor === 'rear' ? count - 1 : (count - 1) / 2;

    const jOff0 = -aOff * step, jOffN = (count - 1 - aOff) * step;
    const arrXMin = Math.min(jOff0 * sDirX, jOffN * sDirX) - halfDepth;
    const arrXMax = Math.max(jOff0 * sDirX, jOffN * sDirX) + halfDepth;
    const arrYMin = Math.min(jOff0 * sDirY, jOffN * sDirY) - halfWidth;
    const arrYMax = Math.max(jOff0 * sDirY, jOffN * sDirY) + halfWidth;

    const lotHW = lot.lotW / 2, lotHD = lot.lotD / 2;
    const clampedCx = Math.min(Math.max(cx, -lotHW - arrXMin), lotHW - arrXMax);
    const clampedCy = Math.min(Math.max(cy, -lotHD - arrYMin), lotHD - arrYMax);
    return { cx: clampedCx, cy: clampedCy };
}
