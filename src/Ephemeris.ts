/**
 * Ephemeris computation using Keplerian orbital elements.
 *
 * Computes heliocentric ecliptic positions for all solar system bodies
 * at any given date using NASA/JPL approximate positions tables and
 * a simplified Meeus lunar theory for the Moon.
 *
 * Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
 * Valid: 3000 BC – 3000 AD (planets), ~1900–2100 (Moon, Pluto)
 * Accuracy: ~arcminute for visual purposes
 */

import type { Ephemeris } from './SIConstants'

// --- Constants ---

const J2000_JD = 2451545.0
const AU_KM = 149597870.691
const DEG = Math.PI / 180
const TWO_PI = 2 * Math.PI

// --- Orbital element tables ---
// Source: JPL Table 2a (3000 BC – 3000 AD)
// Each entry: [a0, aRate, e0, eRate, I0, IRate, L0, LRate,
//              wBar0, wBarRate, Omega0, OmegaRate]
// Units: AU, AU/cy, rad, rad/cy, deg, deg/cy, deg, deg/cy, deg, deg/cy, deg, deg/cy

interface OrbitalElements {
    a0: number; aRate: number
    e0: number; eRate: number
    I0: number; IRate: number
    L0: number; LRate: number
    wBar0: number; wBarRate: number
    Omega0: number; OmegaRate: number
    // Extra terms for outer planets (mean anomaly correction)
    b?: number; c?: number; s?: number; f?: number
}

const ELEMENTS: Record<string, OrbitalElements> = {
    Mercury: {
        a0: 0.38709843, aRate: 0.00000000,
        e0: 0.20563661, eRate: 0.00002123,
        I0: 7.00559432, IRate: -0.00590158,
        L0: 252.25166724, LRate: 149472.67486623,
        wBar0: 77.45771895, wBarRate: 0.15940013,
        Omega0: 48.33961819, OmegaRate: -0.12214182,
    },
    Venus: {
        a0: 0.72332102, aRate: -0.00000026,
        e0: 0.00676399, eRate: -0.00005107,
        I0: 3.39777545, IRate: 0.00043494,
        L0: 181.97970850, LRate: 58517.81560260,
        wBar0: 131.76755713, wBarRate: 0.05679648,
        Omega0: 76.67261496, OmegaRate: -0.27274174,
    },
    Earth: {
        a0: 1.00000018, aRate: -0.00000003,
        e0: 0.01673163, eRate: -0.00003661,
        I0: -0.00054346, IRate: -0.01337178,
        L0: 100.46691572, LRate: 35999.37306329,
        wBar0: 102.93005885, wBarRate: 0.31795260,
        Omega0: -5.11260389, OmegaRate: -0.24123856,
    },
    Mars: {
        a0: 1.52371243, aRate: 0.00000097,
        e0: 0.09336511, eRate: 0.00009149,
        I0: 1.85181869, IRate: -0.00724757,
        L0: -4.56813164, LRate: 19140.29934243,
        wBar0: -23.91744784, wBarRate: 0.45223625,
        Omega0: 49.71320984, OmegaRate: -0.26852431,
    },
    Jupiter: {
        a0: 5.20248019, aRate: -0.00002864,
        e0: 0.04853590, eRate: 0.00018026,
        I0: 1.29861416, IRate: -0.00322699,
        L0: 34.33479152, LRate: 3034.90371757,
        wBar0: 14.27495244, wBarRate: 0.18199196,
        Omega0: 100.29282654, OmegaRate: 0.13024619,
        b: -0.00012452, c: 0.06064060, s: -0.35635438, f: 38.35125000,
    },
    Saturn: {
        a0: 9.54149883, aRate: -0.00003065,
        e0: 0.05550825, eRate: -0.00032044,
        I0: 2.49424102, IRate: 0.00451969,
        L0: 50.07571329, LRate: 1222.11494724,
        wBar0: 92.86136063, wBarRate: 0.54179478,
        Omega0: 113.63998702, OmegaRate: -0.25015002,
        b: 0.00025899, c: -0.13434469, s: 0.87320147, f: 38.35125000,
    },
    Uranus: {
        a0: 19.18797948, aRate: -0.00020455,
        e0: 0.04685740, eRate: -0.00001550,
        I0: 0.77298127, IRate: -0.00180155,
        L0: 314.20276625, LRate: 428.49512595,
        wBar0: 172.43404441, wBarRate: 0.09266985,
        Omega0: 73.96250215, OmegaRate: 0.05739699,
        b: 0.00058331, c: -0.97731848, s: 0.17689245, f: 7.67025000,
    },
    Neptune: {
        a0: 30.06952752, aRate: 0.00006447,
        e0: 0.00895439, eRate: 0.00000818,
        I0: 1.77005520, IRate: 0.00022400,
        L0: 304.22289287, LRate: 218.46515314,
        wBar0: 46.68158724, wBarRate: 0.01009938,
        Omega0: 131.78635853, OmegaRate: -0.00606302,
        b: -0.00041348, c: 0.68346318, s: -0.10162547, f: 7.67025000,
    },
    Pluto: {
        a0: 39.48686035, aRate: 0.00449751,
        e0: 0.24885238, eRate: 0.00006016,
        I0: 17.14104260, IRate: 0.00000501,
        L0: 238.96535011, LRate: 145.18042903,
        wBar0: 224.09702598, wBarRate: -0.00968827,
        Omega0: 110.30167986, OmegaRate: -0.00809981,
    },
}

// --- Date conversion ---

export function dateToJulianDate(date: Date): number {
    const y = date.getUTCFullYear()
    const m = date.getUTCMonth() + 1
    const d = date.getUTCDate()
    const h = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600

    let Y = y
    let M = m
    if (M <= 2) { Y -= 1; M += 12 }

    const A = Math.floor(Y / 100)
    const B = 2 - A + Math.floor(A / 4)

    return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + h / 24 + B - 1524.5
}

export function julianCenturiesSinceJ2000(jd: number): number {
    return (jd - J2000_JD) / 36525
}

// --- Kepler's equation solver ---

function normalizeAngle(angle: number): number {
    let a = angle % 360
    if (a < 0) a += 360
    return a
}

export function solveKepler(M_deg: number, e: number): number {
    const M = normalizeAngle(M_deg) * DEG
    let E = M + e * Math.sin(M) * (1 + e * Math.cos(M))

    for (let i = 0; i < 10; i++) {
        const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
        E -= dE
        if (Math.abs(dE) < 1e-12) break
    }

    return E
}

// --- Orbital elements to heliocentric ecliptic Cartesian ---

function computePlanetPosition(name: string, T: number): { x: number; y: number; z: number } {
    const el = ELEMENTS[name]

    const a = el.a0 + el.aRate * T
    const e = el.e0 + el.eRate * T
    const I = (el.I0 + el.IRate * T) * DEG
    const L = el.L0 + el.LRate * T
    const wBar = el.wBar0 + el.wBarRate * T
    const Omega = (el.Omega0 + el.OmegaRate * T) * DEG

    // Mean anomaly
    let M = L - wBar

    // Extra terms for outer planets
    if (el.b !== undefined) {
        const fT = el.f! * T
        M += el.b! * T * T + el.c! * Math.cos(fT * DEG) + el.s! * Math.sin(fT * DEG)
    }

    // Argument of perihelion
    const w = (wBar - el.Omega0 - el.OmegaRate * T) * DEG

    // Solve Kepler's equation
    const E = solveKepler(M, e)

    // Heliocentric coordinates in the orbital plane
    const xPrime = a * (Math.cos(E) - e)
    const yPrime = a * Math.sqrt(1 - e * e) * Math.sin(E)

    // Rotate to ecliptic coordinates
    const cosW = Math.cos(w)
    const sinW = Math.sin(w)
    const cosO = Math.cos(Omega)
    const sinO = Math.sin(Omega)
    const cosI = Math.cos(I)
    const sinI = Math.sin(I)

    const x = (cosW * cosO - sinW * sinO * cosI) * xPrime + (-sinW * cosO - cosW * sinO * cosI) * yPrime
    const y = (cosW * sinO + sinW * cosO * cosI) * xPrime + (-sinW * sinO + cosW * cosO * cosI) * yPrime
    const z = (sinW * sinI) * xPrime + (cosW * sinI) * yPrime

    return { x, y, z }
}

// --- Moon position (simplified Meeus Ch. 47) ---

function computeMoonPosition(T: number, earthPos: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    // Fundamental arguments (degrees)
    const Lp = normalizeAngle(218.3164477 + 481267.88123421 * T)  // Moon's mean longitude
    const D = normalizeAngle(297.8501921 + 445267.1114034 * T)    // Mean elongation
    const M = normalizeAngle(357.5291092 + 35999.0502909 * T)     // Sun's mean anomaly
    const Mp = normalizeAngle(134.9633964 + 477198.8675055 * T)   // Moon's mean anomaly
    const F = normalizeAngle(93.2720950 + 483202.0175233 * T)     // Moon's argument of latitude

    // Convert to radians for trig
    const Dr = D * DEG
    const Mr = M * DEG
    const Mpr = Mp * DEG
    const Fr = F * DEG

    // Longitude terms (largest ~20 terms from Meeus Table 47.A)
    let sumL = 0
    sumL += 6288774 * Math.sin(Mpr)
    sumL += 1274027 * Math.sin(2 * Dr - Mpr)
    sumL += 658314 * Math.sin(2 * Dr)
    sumL += 213618 * Math.sin(2 * Mpr)
    sumL += -185116 * Math.sin(Mr)
    sumL += -114332 * Math.sin(2 * Fr)
    sumL += 58793 * Math.sin(2 * Dr - 2 * Mpr)
    sumL += 57066 * Math.sin(2 * Dr - Mr - Mpr)
    sumL += 53322 * Math.sin(2 * Dr + Mpr)
    sumL += 45758 * Math.sin(2 * Dr - Mr)
    sumL += -40923 * Math.sin(Mr - Mpr)
    sumL += -34720 * Math.sin(Dr)
    sumL += -30383 * Math.sin(Mr + Mpr)
    sumL += 15327 * Math.sin(2 * Dr - 2 * Fr)
    sumL += -12528 * Math.sin(Mpr + 2 * Fr)
    sumL += 10980 * Math.sin(Mpr - 2 * Fr)

    // Latitude terms (largest terms from Meeus Table 47.B)
    let sumB = 0
    sumB += 5128122 * Math.sin(Fr)
    sumB += 280602 * Math.sin(Mpr + Fr)
    sumB += 277693 * Math.sin(Mpr - Fr)
    sumB += 173237 * Math.sin(2 * Dr - Fr)
    sumB += 55413 * Math.sin(2 * Dr - Mpr + Fr)
    sumB += 46271 * Math.sin(2 * Dr - Mpr - Fr)
    sumB += 32573 * Math.sin(2 * Dr + Fr)
    sumB += 17198 * Math.sin(2 * Mpr + Fr)
    sumB += 9266 * Math.sin(2 * Dr + Mpr - Fr)
    sumB += 8822 * Math.sin(2 * Mpr - Fr)

    // Distance terms (largest from Meeus Table 47.A)
    let sumR = 0
    sumR += -20905355 * Math.cos(Mpr)
    sumR += -3699111 * Math.cos(2 * Dr - Mpr)
    sumR += -2955968 * Math.cos(2 * Dr)
    sumR += -569925 * Math.cos(2 * Mpr)
    sumR += 48888 * Math.cos(Mr)
    sumR += -3149 * Math.cos(2 * Fr)
    sumR += 246158 * Math.cos(2 * Dr - 2 * Mpr)
    sumR += -152138 * Math.cos(2 * Dr - Mr - Mpr)
    sumR += -170733 * Math.cos(2 * Dr + Mpr)
    sumR += -204586 * Math.cos(2 * Dr - Mr)
    sumR += -129620 * Math.cos(Mr - Mpr)
    sumR += 108743 * Math.cos(Dr)
    sumR += 104755 * Math.cos(Mr + Mpr)

    // Ecliptic longitude and latitude (degrees)
    const longitude = (Lp + sumL / 1000000) * DEG
    const latitude = (sumB / 1000000) * DEG
    // Distance in km
    const distance = 385000.56 + sumR / 1000

    // Geocentric ecliptic Cartesian (km)
    const xGeo = distance * Math.cos(latitude) * Math.cos(longitude)
    const yGeo = distance * Math.cos(latitude) * Math.sin(longitude)
    const zGeo = distance * Math.sin(latitude)

    // Convert to AU and add Earth's heliocentric position
    return {
        x: earthPos.x + xGeo / AU_KM,
        y: earthPos.y + yGeo / AU_KM,
        z: earthPos.z + zGeo / AU_KM,
    }
}

// --- Public API ---

export function computeEphemerisForDate(date: Date): Record<string, Ephemeris> {
    const jd = dateToJulianDate(date)
    const T = julianCenturiesSinceJ2000(jd)

    const result: Record<string, Ephemeris> = {}

    // Sun at heliocentric origin
    result['Sun'] = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 }

    // Planets
    for (const name of Object.keys(ELEMENTS)) {
        const pos = computePlanetPosition(name, T)
        result[name] = {
            x: pos.x * AU_KM,
            y: pos.y * AU_KM,
            z: pos.z * AU_KM,
            vx: 0, vy: 0, vz: 0,
        }
    }

    // Moon (needs Earth's position)
    const earthAU = computePlanetPosition('Earth', T)
    const moonAU = computeMoonPosition(T, earthAU)
    result['Moon'] = {
        x: moonAU.x * AU_KM,
        y: moonAU.y * AU_KM,
        z: moonAU.z * AU_KM,
        vx: 0, vy: 0, vz: 0,
    }

    return result
}
