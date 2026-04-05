export interface Ephemeris {
    x: number; y: number; z: number
    vx: number; vy: number; vz: number
}

export interface BodyVisuals {
    tex_color?: string
    tex_bump?: string
    tex_spec?: string
    tex_normal?: string
}

export interface BodyRings {
    near: number
    far: number
    tex_color: string
}

export interface BodyAtmosphere {
    tex_color: string
}

export interface BodyRotation {
    period: number          // Sidereal rotation period in hours (negative = retrograde)
    northPoleRA: number     // Right ascension of north pole (degrees, J2000)
    northPoleDec: number    // Declination of north pole (degrees, J2000)
    W0: number              // Prime meridian angle at J2000 epoch (degrees, IAU)
    tidallyLocked?: string  // Name of parent body if tidally locked
}

export interface BodyData {
    name: string
    mass: number
    radius: number
    std_grav_param: number
    type: string
    ephemeris: Ephemeris
    visuals?: BodyVisuals
    rings?: BodyRings
    atmosphere?: BodyAtmosphere
    rotation?: BodyRotation
}

/**
 * Standard gravitational parameters, mu (m^3 s^-2).
 *
 * For several objects in the Solar System, the value of
 * mu is known to greater accuracy than either G or M.
 *
 * https://en.wikipedia.org/wiki/Standard_gravitational_parameter
 *
 * Small body orbiting a central body: if the distance between
 * the bodies is r, the force exerted on the smaller body is:
 *
 * F = (G M m) / (r * r) = (mu m) / (r * r)
 */
export const StdGravParams: Record<string, number> = {
    'Sun': 1.32712440018e20,
    'Mercury': 2.2032e13,
    'Venus': 3.24859e14,
    'Earth': 3.986004418e14,
    'Moon': 4.9048695e12,
    'Mars': 4.282837e13,
    'Ceres': 6.26325e10,
    'Jupiter': 1.26686534e17,
    'Saturn': 3.7931187e16,
    'Uranus': 5.793939e15,
    'Neptune': 6.836529e15,
    'Pluto': 8.71e11,
    'Eris': 1.108e12
}

/**
 * Solar System Database
 * https://en.wikipedia.org/wiki/List_of_Solar_System_objects_by_size
 *
 *   name - string
 *   mass - kg
 * radius - km
 *   type - string
 */
export const SolarSystemDB: Record<string, BodyData> = {

    Sun: {
        name: 'Sun',
        mass: 1988550000e21,
        radius: 696342,
        std_grav_param: StdGravParams.Sun,
        type: 'star',
        rotation: { period: 609.12, northPoleRA: 286.13, northPoleDec: 63.87, W0: 84.176 },
        ephemeris: {
            /**
             * Coordinate Origin: Solar System Barycenter (SSB)
             * Timestamp: 2018-Dec-29 00:00:00.0000
             * Units: km and km/s
             */
            x: -1.095532230425258E+05,
            y: 1.110446988329352E+06,
            z: -8.672689080045151E+03,
            vx: -1.358193795348310E-02,
            vy: 3.470300657659900E-03,
            vz: 3.466771035947819E-04
        }
    },

    Mercury: {
        name: 'Mercury',
        mass: 330.2e21,
        radius: 2439.7,
        std_grav_param: StdGravParams.Mercury,
        type: 'planet (terrestrial)',
        rotation: { period: 1407.6, northPoleRA: 281.01, northPoleDec: 61.45, W0: 329.5988 },
        ephemeris: {
            x: -5.294050804281836E+07,
            y: -3.775098987047710E+07,
            z: 1.662427406682396E+06,
            vx: 1.887341540005309E+01,
            vy: -3.707233214957979E+01,
            vz: -4.761898618226503E+00,
        },
        visuals: {
            tex_color: 'textures/mercury/2k_mercury.jpg',
            tex_bump: 'textures/mercury/2k_mercury_bump.jpg',
        },
    },

    Venus: {
        name: 'Venus',
        mass: 4868.5e21,
        radius: 6051.8,
        std_grav_param: StdGravParams.Venus,
        type: 'planet (terrestrial)',
        rotation: { period: -5832.6, northPoleRA: 272.76, northPoleDec: 67.16, W0: 160.20 },
        ephemeris: {
            x: -7.622496178100505E+07,
            y: 7.680118021439891E+07,
            z: 5.422340657278594E+06,
            vx: -2.483416148152178E+01,
            vy: -2.501269490886191E+01,
            vz: 1.089432846551251E+00
        },
        visuals: {
            tex_color: 'textures/venus/2k_venus_surface.jpg',
            tex_bump: 'textures/venus/2k_venus_surface_bump.jpg',
        },
    },

    Earth: {
        name: 'Earth',
        mass: 5973.6e21,
        radius: 6371,
        std_grav_param: StdGravParams.Earth,
        type: 'planet (terrestrial)',
        rotation: { period: 23.9345, northPoleRA: 0.0, northPoleDec: 90.0, W0: 190.147 },
        ephemeris: {
            /**
             * Coordinate Origin: Solar System Barycenter (SSB)
             * Timestamp: 2018-Dec-29 00:00:00.0000
             * Units: km and km/s
             */
            x: -1.789118651260976E+07,
            y: 1.471403859477293E+08,
            z: -1.563232166729122E+04,
            vx: -3.006950031972895E+01,
            vy: -3.697501025529295E+00,
            vz: 6.269088974675263E-05
        },
        visuals: {
            /**
             * Textures from:
             *  - https://www.solarsystemscope.com/textures/
             *  - http://www.shadedrelief.com/natural3/index.html
             */
            tex_color: 'textures/earth/no-clouds-or-arctic-ocean-ice.jpg',
            tex_bump: 'textures/earth/terrestrial-elevation.jpg',
            tex_spec: 'textures/earth/land-water-mask.jpg',
        },
        atmosphere: {
            tex_color: 'textures/earth/clouds-fair-weather.jpg',
        }
    },

    Moon: {
        name: 'Moon',
        mass: 73.5e21,
        radius: 1737.1,
        std_grav_param: StdGravParams.Moon,
        type: 'moon of Earth',
        rotation: { period: 655.73, northPoleRA: 270.0, northPoleDec: 66.54, W0: 38.3213, tidallyLocked: 'Earth' },
        ephemeris: {
            /**
             * Coordinate Origin: Solar System Barycenter (SSB)
             * Timestamp: 2018-Dec-29 00:00:00.0000
             * Units: km and km/s
             */
            x: -1.826370570115749E+07,
            y: 1.471285275025022E+08,
            z: 1.556343763963133E+04,
            vx: -3.008410862179494E+01,
            vy: -4.743310674263205E+00,
            vz: 4.459035856485372E-02,
        },
        visuals: {
            tex_color: 'textures/moon/moonmap.jpg',
            tex_bump: 'textures/moon/moonbump.jpg',
        },
    },

    Mars: {
        name: 'Mars',
        mass: 641.85e21,
        radius: 3389.5,
        std_grav_param: StdGravParams.Mars,
        type: 'planet (terrestrial)',
        rotation: { period: 24.6229, northPoleRA: 317.68, northPoleDec: 52.89, W0: 176.049 },
        ephemeris: {
            x: 1.668276381641096E+08,
            y: 1.396078666200140E+08,
            z: -1.202865775429659E+06,
            vx: -1.456335846349012E+01,
            vy: 2.071873801081363E+01,
            vz: 7.914286108327682E-01,
        },
        visuals: {
            tex_color: 'textures/mars/2k_mars.jpg',
            tex_bump: 'textures/mars/2k_mars_bump.jpg',
        },
    },

    Jupiter: {
        name: 'Jupiter',
        mass: 1898600e21,
        radius: 69911,
        std_grav_param: StdGravParams.Jupiter,
        type: 'planet (gas giant); has rings',
        rotation: { period: 9.925, northPoleRA: 268.05, northPoleDec: 64.49, W0: 284.95 },
        ephemeris: {
            x: -3.224598868428773E+08,
            y: -7.315098672618929E+08,
            z: 1.024691907133248E+07,
            vx: 1.179857168997123E+01,
            vy: -4.648929285488586E+00,
            vz: -2.447243767022833E-01,
        },
        visuals: {
            tex_color: 'textures/jupiter/2k_jupiter.jpg',
        },
    },

    Saturn: {
        name: 'Saturn',
        mass: 568460e21,
        radius: 58232,
        std_grav_param: StdGravParams.Saturn,
        type: 'planet (gas giant); has rings',
        rotation: { period: 10.656, northPoleRA: 40.60, northPoleDec: 83.54, W0: 38.90 },
        ephemeris: {
            x: 2.907175167445949E+08,
            y: -1.475467667745180E+09,
            z: 1.408232377568173E+07,
            vx: 8.945898544381055E+00,
            vy: 1.837682881914058E+00,
            vz: -3.885338975003587E-01,
        },
        visuals: {
            tex_color: 'textures/saturn/2k_saturn.jpg',
        },
        rings: {
            near: 74658,
            far: 136775,
            tex_color: 'textures/saturn/2k_saturn_ring_alpha.png',
        },
    },

    Uranus: {
        name: 'Uranus',
        mass: 86832e21,
        radius: 25362,
        std_grav_param: StdGravParams.Uranus,
        type: 'planet (ice giant); has rings',
        rotation: { period: -17.24, northPoleRA: 257.31, northPoleDec: -15.18, W0: 203.81 },
        ephemeris: {
            x: 2.546377528357834E+09,
            y: 1.532027426064579E+09,
            z: -2.729868474694943E+07,
            vx: -3.560771292840762E+00,
            vy: 5.517875871296057E+00,
            vz: 6.680442269750042E-02,
        },
        visuals: {
            tex_color: 'textures/uranus/2k_uranus.jpg',
        },
    },

    Neptune: {
        name: 'Neptune',
        mass: 102430e21,
        radius: 24622,
        std_grav_param: StdGravParams.Neptune,
        type: 'planet (ice giant); has rings',
        rotation: { period: 16.11, northPoleRA: 299.36, northPoleDec: 43.46, W0: 253.18 },
        ephemeris: {
            x: 4.335247964748558E+09,
            y: -1.120545299150495E+09,
            z: -7.683464840594876E+07,
            vx: 1.323796675499058E+00,
            vy: 5.295175507811586E+00,
            vz: -1.388478893539726E-01,
        },
        visuals: {
            tex_color: 'textures/neptune/2k_neptune.jpg',
        },
    },

    Pluto: {
        name: 'Pluto',
        mass: 13.105e21,
        radius: 1186,
        std_grav_param: StdGravParams.Pluto,
        type: 'dwarf planet',
        rotation: { period: -153.29, northPoleRA: 132.99, northPoleDec: -6.16, W0: 302.695 },
        ephemeris: {
            x: 1.776130355374673E+09,
            y: -4.718638666649714E+09,
            z: -8.837448876088858E+06,
            vx: 5.222507401995748E+00,
            vy: 7.737878531994880E-01,
            vz: -1.605291116469387E+00,
        },
    },

}
