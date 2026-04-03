import { describe, it, expect } from 'vitest'
import { dateToJulianDate, julianCenturiesSinceJ2000, solveKepler, computeEphemerisForDate } from './Ephemeris'

describe('Julian Date conversion', () => {
    it('computes J2000.0 epoch correctly', () => {
        // J2000.0 = 2000-Jan-01 12:00:00 TDB = JD 2451545.0
        const date = new Date('2000-01-01T12:00:00Z')
        expect(dateToJulianDate(date)).toBeCloseTo(2451545.0, 4)
    })

    it('computes JD for 2023-Feb-25 correctly', () => {
        const date = new Date('2023-02-25T00:00:00Z')
        expect(dateToJulianDate(date)).toBeCloseTo(2460000.5, 4)
    })

    it('computes T=0 at J2000.0', () => {
        expect(julianCenturiesSinceJ2000(2451545.0)).toBeCloseTo(0, 10)
    })
})

describe('Kepler equation solver', () => {
    it('solves for circular orbit (e=0)', () => {
        const E = solveKepler(90, 0)
        expect(E).toBeCloseTo(Math.PI / 2, 8)
    })

    it('solves for moderate eccentricity', () => {
        // For e=0.2, M=30°: E satisfies E - e*sin(E) = M
        // Verify the solution satisfies the equation
        const M = 30 * Math.PI / 180
        const e = 0.2
        const E = solveKepler(30, e)
        expect(E - e * Math.sin(E)).toBeCloseTo(M, 8)
    })

    it('solves for high eccentricity (Pluto-like)', () => {
        // For e=0.25, M=180°: E should equal π (symmetry)
        const E = solveKepler(180, 0.25)
        expect(E).toBeCloseTo(Math.PI, 6)
    })
})

describe('Planet positions vs JPL Horizons', () => {
    // Reference data: JPL Horizons, heliocentric ecliptic J2000
    // Date: JD 2460000.5 (2023-Feb-25 00:00:00 TDB)
    // Center: Sun (10), Ref plane: Ecliptic of J2000.0
    // Units: km

    const jplReference: Record<string, { x: number; y: number; z: number }> = {
        Mercury: { x: 1.522359613e+07, y: -6.600176071e+07, z: -6.790050188e+06 },
        Venus:   { x: 7.222086266e+07, y: 8.040128843e+07, z: -3.063473524e+06 },
        Earth:   { x: -1.350382278e+08, y: 6.071388845e+07, z: -2.442912283e+03 },
        Mars:    { x: -9.856378741e+07, y: 2.217326160e+08, z: 7.064823927e+06 },
        Jupiter: { x: 7.072851174e+08, y: 2.193797422e+08, z: -1.673551572e+07 },
        Saturn:  { x: 1.241392261e+09, y: -7.851657627e+08, z: -3.575089295e+07 },
        Uranus:  { x: 1.975975464e+09, y: 2.178684277e+09, z: -1.752200584e+07 },
        Neptune: { x: 4.454447839e+09, y: -4.143016965e+08, z: -9.412511737e+07 },
        Pluto:   { x: 2.443465095e+09, y: -4.577308507e+09, z: -2.166308697e+08 },
    }

    const ephemeris = computeEphemerisForDate(new Date('2023-02-25T00:00:00Z'))

    // Tolerance: Keplerian approximation is arcminute-level.
    // Inner planets: within ~5 million km (~0.03 AU)
    // Outer planets: within ~50 million km (~0.3 AU)
    const innerTolerance = 10_000_000  // 10M km
    const outerTolerance = 100_000_000 // 100M km

    function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
        return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
    }

    for (const [name, jpl] of Object.entries(jplReference)) {
        const tolerance = ['Mercury', 'Venus', 'Earth', 'Mars'].includes(name) ? innerTolerance : outerTolerance

        it(`${name} position within ${tolerance / 1e6}M km of JPL Horizons`, () => {
            const computed = ephemeris[name]
            expect(computed).toBeDefined()
            const dist = distance(jpl, { x: computed.x, y: computed.y, z: computed.z })
            expect(dist).toBeLessThan(tolerance)
        })
    }
})

describe('Moon position', () => {
    it('Moon is within 0.01 AU of Earth', () => {
        const date = new Date('2023-02-25T00:00:00Z')
        const ephemeris = computeEphemerisForDate(date)

        const earth = ephemeris['Earth']
        const moon = ephemeris['Moon']

        expect(earth).toBeDefined()
        expect(moon).toBeDefined()

        const AU_KM = 149597870.691
        const dist = Math.sqrt(
            (earth.x - moon.x) ** 2 +
            (earth.y - moon.y) ** 2 +
            (earth.z - moon.z) ** 2
        )

        // Moon is ~384,400 km from Earth = ~0.00257 AU
        // Allow up to 0.01 AU tolerance
        expect(dist / AU_KM).toBeLessThan(0.01)
        // But also verify it's not zero (sanity check)
        expect(dist / AU_KM).toBeGreaterThan(0.001)
    })
})

describe('Sun position', () => {
    it('Sun is at heliocentric origin', () => {
        const ephemeris = computeEphemerisForDate(new Date())
        const sun = ephemeris['Sun']
        expect(sun.x).toBe(0)
        expect(sun.y).toBe(0)
        expect(sun.z).toBe(0)
    })
})
