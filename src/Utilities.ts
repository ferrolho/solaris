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
