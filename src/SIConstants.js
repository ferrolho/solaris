// const SIConstants = {

//     /**
//      * G is the gravitational constant (6.674×10−11 N · (m/kg)2).
//      * https://en.wikipedia.org/wiki/Gravitational_constant
//      */
//     G = 6.674e-11


//     /**
//      * https://en.wikipedia.org/wiki/Astronomical_system_of_units
//      * 
//      * All lengths are in AU (astronomical unit).
//      * 1 km = 1 / 1.496e+8
//      * 
//      * All masses are in kg (kilogram).
//      */

//     const ua_earth_mass = 5.97237e24
//     const ua_earth_radius = 4.2586898395721926e-05

//     const ua_moon_mass = 7.342e22
//     const ua_moon_radius = 1.1611631016042781e-05

// }

/**
 * Standard gravitational parameters, μ (m^3 s^−2).
 * 
 * For several objects in the Solar System, the value of
 * μ is known to greater accuracy than either G or M.
 * 
 * https://en.wikipedia.org/wiki/Standard_gravitational_parameter
 * 
 * Small body orbiting a central body: if the distance between
 * the bodies is r, the force exerted on the smaller body is:
 * 
 * F = (G M m) / (r * r) = (μ m) / (r * r)
 */
const StdGravParams = {
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
const SolarSystemDB = {

    Sun: {
        name: 'Sun',
        mass: 1988550000e21,
        radius: 696342,
        std_grav_param: StdGravParams.Sun,
        type: 'star'
    },

    Earth: {
        name: 'Earth',
        mass: 5973.6e21,
        radius: 6371,
        std_grav_param: StdGravParams.Earth,
        type: 'planet (terrestrial)'
    },

    Moon: {
        name: 'Moon',
        mass: 73.5e21,
        radius: 1737.1,
        std_grav_param: StdGravParams.Moon,
        type: 'moon of Earth'
    },

    Jupiter: {
        name: 'Jupiter',
        mass: 1898600e21,
        radius: 58232,
        std_grav_param: StdGravParams.Jupiter,
        type: 'planet (gas giant); has rings'
    },

}

// browserify support
if (typeof module === 'object') {

    // module.exports = SIConstants;
    module.exports = StdGravParams;
    module.exports = SolarSystemDB;

}
