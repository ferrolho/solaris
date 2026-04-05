import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { dateToJulianDate } from './Ephemeris'
import {
    northPoleToWorldAxis,
    computeGMST,
    raToWorldDirection,
} from './Utilities'

/**
 * Replicate Body.buildOrientationQuat for testing without importing Body
 * (which has side effects via Workspace imports).
 */
function buildOrientationQuat(spinAxis: THREE.Vector3, pmRA_deg: number): THREE.Quaternion {
    const pmDir = raToWorldDirection(pmRA_deg)
    const col_x = new THREE.Vector3(pmDir.x, pmDir.y, pmDir.z)
    const col_y = spinAxis.clone()
    const col_z = new THREE.Vector3().crossVectors(col_x, col_y).normalize()
    col_x.crossVectors(col_y, col_z).normalize()
    const m = new THREE.Matrix4().makeBasis(col_x, col_y, col_z)
    return new THREE.Quaternion().setFromRotationMatrix(m)
}

/**
 * Compute the sub-solar longitude given a mesh quaternion and Sun direction.
 * Uses atan2(z, x) in the body-fixed frame.
 */
function computeSubSolarLon(meshQuat: THREE.Quaternion, sunWorldDir: THREE.Vector3): number {
    const invQ = meshQuat.clone().invert()
    const sunBody = sunWorldDir.clone().applyQuaternion(invQ)
    return Math.atan2(sunBody.z, sunBody.x) * (180 / Math.PI)
}

describe('GMST computation', () => {
    it('gives ~280.46° at J2000 epoch', () => {
        const jd = 2451545.0  // J2000.0
        const gmst = computeGMST(jd)
        expect(gmst).toBeCloseTo(280.46, 1)
    })

    it('advances ~361° per day (sidereal rate)', () => {
        const jd1 = 2451545.0
        const jd2 = 2451546.0
        const diff = computeGMST(jd2) - computeGMST(jd1)
        // Sidereal day is ~360.986° rotation per solar day → 0.986° after mod 360
        expect(((diff % 360) + 360) % 360).toBeCloseTo(0.986, 1)
    })
})

describe('Earth sub-solar longitude', () => {
    // Sun is at ecliptic longitude ~14.3° on April 4
    // (matches computeEphemerisForDate output for 2026-04-04)
    const sunEclLonRad = 14.3 * Math.PI / 180
    const sunWorld = new THREE.Vector3(
        Math.cos(sunEclLonRad), 0, Math.sin(sunEclLonRad)
    ).normalize()

    const spinAxis = (() => {
        const a = northPoleToWorldAxis(0, 90)
        return new THREE.Vector3(a.x, a.y, a.z).normalize()
    })()

    const testCases: [string, number][] = [
        ['2026-04-04T00:00:00Z', 180],  // midnight UTC → Sun at ~180°
        ['2026-04-04T06:00:00Z', 90],   // 06:00 UTC → Sun at ~90°E
        ['2026-04-04T12:00:00Z', 0],    // noon UTC → Sun at ~0° (Greenwich)
        ['2026-04-04T18:00:00Z', -90],  // 18:00 UTC → Sun at ~90°W
    ]

    for (const [isoDate, expectedLon] of testCases) {
        it(`places sub-solar point near ${expectedLon}° at ${isoDate.slice(11, 16)} UTC`, () => {
            const jd = dateToJulianDate(new Date(isoDate))
            const gmst = computeGMST(jd)
            const q = buildOrientationQuat(spinAxis, gmst)
            const lon = computeSubSolarLon(q, sunWorld)

            // Allow ±15° tolerance (equation of time + Sun RA offset from equinox)
            const diff = ((lon - expectedLon + 540) % 360) - 180  // signed angular diff
            expect(Math.abs(diff)).toBeLessThan(15)
        })
    }

    it('places sub-solar point within 2° of precise calculation at 09:57 UTC', () => {
        const date = new Date('2026-04-04T09:57:00Z')
        const jd = dateToJulianDate(date)
        const gmst = computeGMST(jd)
        const q = buildOrientationQuat(spinAxis, gmst)
        const lon = computeSubSolarLon(q, sunWorld)

        // At 09:57 UTC, mean solar sub-solar ≈ 30.8°E
        // With Sun RA ≈ 13°, actual sub-solar ≈ 31°E
        expect(lon).toBeCloseTo(31, 0)  // within 0.5°
    })
})

describe('Earth spin axis', () => {
    it('is tilted ~23.44° from ecliptic north (+Y)', () => {
        const axis = northPoleToWorldAxis(0, 90)
        const spinAxis = new THREE.Vector3(axis.x, axis.y, axis.z)
        const eclipticNorth = new THREE.Vector3(0, 1, 0)
        const angle = spinAxis.angleTo(eclipticNorth) * (180 / Math.PI)
        expect(angle).toBeCloseTo(23.44, 0)
    })

    it('has zero X component (tilts in YZ plane)', () => {
        const axis = northPoleToWorldAxis(0, 90)
        expect(axis.x).toBeCloseTo(0, 10)
    })
})
