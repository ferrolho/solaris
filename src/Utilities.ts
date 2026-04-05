/* Length */

/** Converts kilometres to astronomical units */
export function km_to_astronomical_units(length: number): number { return length * 6.6845871226706e-9 }

/** Converts astronomical units to kilometres */
export function astronomical_units_to_km(length: number): number { return length * 149597870.691 }


/* Mass */

/** Converts kilograms to solar masses */
export function kg_to_solar_masses(mass: number): number { return mass * 5.02785431e-31 }

/** Converts solar masses to kilograms */
export function solar_masses_to_kg(mass: number): number { return mass * 1.9889200011446e+30 }


/* Rotation */

/**
 * Convert IAU north pole RA/Dec (equatorial J2000, degrees) to a
 * Three.js world-space unit vector.
 *
 * Steps: equatorial → ecliptic → Three.js coordinate swap
 * (ecliptic X → x, ecliptic Y → z, ecliptic Z → y)
 */
export function northPoleToWorldAxis(raDeg: number, decDeg: number): { x: number; y: number; z: number } {
    const ra = raDeg * Math.PI / 180
    const dec = decDeg * Math.PI / 180
    const eps = 23.4393 * Math.PI / 180  // obliquity of the ecliptic

    // Equatorial unit vector
    const eq_x = Math.cos(dec) * Math.cos(ra)
    const eq_y = Math.cos(dec) * Math.sin(ra)
    const eq_z = Math.sin(dec)

    // Rotate to ecliptic
    const ecl_x = eq_x
    const ecl_y = eq_y * Math.cos(eps) + eq_z * Math.sin(eps)
    const ecl_z = -eq_y * Math.sin(eps) + eq_z * Math.cos(eps)

    // Map to Three.js: ecliptic X → x, ecliptic Z → y, ecliptic Y → z
    return { x: ecl_x, y: ecl_z, z: ecl_y }
}

/**
 * Compute Greenwich Mean Sidereal Time in degrees for a given Julian Date.
 * Uses the IAU formula for GMST.
 */
export function computeGMST(jd: number): number {
    const D = jd - 2451545.0
    const T = D / 36525.0
    // Meeus formula — result in degrees
    let gmst = 280.46061837 + 360.98564736629 * D + 0.000387933 * T * T - T * T * T / 38710000
    gmst = ((gmst % 360) + 360) % 360  // normalize to 0..360
    return gmst
}

/**
 * Compute the right ascension of a body's prime meridian in degrees.
 * Uses the IAU convention: RA_pm = α₀ + 90° + W,
 * where W = W₀ + Wd × d (days since J2000).
 *
 * For Earth, this equals GMST (verified: GMST = W + 90° when α₀ = 0°).
 */
export function computePrimeMeridianRA(
    northPoleRA: number, W0: number, periodHours: number,
    jd: number
): number {
    const d = jd - 2451545.0
    const Wd = 360.0 / (periodHours / 24.0)  // degrees per day
    const W = W0 + Wd * d
    const ra = northPoleRA + 90 + W
    return ((ra % 360) + 360) % 360
}

/**
 * Convert an equatorial right ascension (degrees) to a unit direction vector
 * in Three.js world space, lying in the equatorial plane (Dec = 0).
 */
export function raToWorldDirection(raDeg: number): { x: number; y: number; z: number } {
    const ra = raDeg * Math.PI / 180
    const eps = 23.4393 * Math.PI / 180

    // Equatorial unit vector at Dec=0
    const eq_x = Math.cos(ra)
    const eq_y = Math.sin(ra)
    const eq_z = 0

    // Rotate to ecliptic
    const ecl_x = eq_x
    const ecl_y = eq_y * Math.cos(eps) + eq_z * Math.sin(eps)
    const ecl_z = -eq_y * Math.sin(eps) + eq_z * Math.cos(eps)

    // Three.js coords: ecliptic X → x, ecliptic Z → y, ecliptic Y → z
    return { x: ecl_x, y: ecl_z, z: ecl_y }
}
