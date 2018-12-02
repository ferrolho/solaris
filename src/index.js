const Detector = require('./three.js/Detector')
if (!Detector.webgl) Detector.addGetWebGLMessage()

const Gamepad = require('./gamepad.js/gamepad.js')
const gamepad = new Gamepad()

const Stats = require('stats.js')
const stats = new Stats()
stats.dom.id = 'statsjs'
document.body.appendChild(stats.dom)

const THREE = require('three')
require('./three.js/controls/OrbitControls')(THREE)
require('./three.js/loaders/FBXLoader')(THREE)

import StdGravParams from './SIConstants'
import SolarSystemDB from './SIConstants'

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: false })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true;
$('#threejs-container').append(renderer.domElement)

let cameraTarget = new THREE.Vector3(0, 0, 0)

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color('white');
// scene.fog = new THREE.Fog(0x000, 0, 100);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1e-6)

// Orbit Controls
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.enableKeys = false
orbitControls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8

camera.position.set(0, 40, 0)
camera.lookAt(cameraTarget)
orbitControls.update()

const textureLoader = new THREE.TextureLoader();

/**
 * Textures from:
 *  - https://www.solarsystemscope.com/textures/
 *  - http://www.shadedrelief.com/natural3/index.html
 */
const earth_tex_color = textureLoader.load('./textures/earth/no-clouds-or-arctic-ocean-ice.jpg')
const earth_tex_bump = textureLoader.load('./textures/earth/terrestrial-elevation.jpg')
const earth_tex_spec = textureLoader.load('./textures/earth/land-water-mask.jpg')
const earth_clouds_tex = textureLoader.load('./textures/earth/clouds-fair-weather.jpg')

const skybox_tex = textureLoader.load('./textures/stars_milky_way.jpg')

// const moon_tex_map = textureLoader.load('./textures/moon/moonmap4k.jpg')
// const moon_tex_bump = textureLoader.load('./textures/moon/moonbump4k.jpg')

const skybox = new THREE.Mesh(
    new THREE.SphereGeometry(1e9),
    new THREE.MeshPhongMaterial({
        color: 'black',
        emissive: 'white',
        specular: 'black',
        map: skybox_tex,
        emissiveMap: skybox_tex,
        side: THREE.BackSide,
    }))

scene.add(skybox)

$(document).ready(function () {
    init()
    animate()
})

function init() {
    // Axes Helper
    const axis = new THREE.AxesHelper(9371e3)
    scene.add(axis)

    // Grid Helper
    const grid = new THREE.GridHelper(10, 40)
    grid.material.color.setHex(0xffffff)
    grid.material.opacity = 0.4
    grid.material.transparent = true
    scene.add(grid)


    // Lights

    let light = new THREE.PointLight('white', 1, 0, 2)
    light.position.set(200, 0, 0)
    // light.castShadow = true;
    // light.shadow.camera.top = 20;
    // light.shadow.camera.bottom = -20;
    // light.shadow.camera.left = -20;
    // light.shadow.camera.right = 20;
    // light.shadow.radius = 0.2;

    scene.add(light)

    // scene.add(new THREE.CameraHelper(light.shadow.camera));

    initSolarSystem()
}

const material_1 = new THREE.MeshLambertMaterial({ color: 0x118844 })
const material_2 = new THREE.MeshLambertMaterial({ color: 0x333333 })

/**
 * Newton's law of universal gravitation
 * https://en.wikipedia.org/wiki/Newton%27s_law_of_universal_gravitation
 * 
 * @param m1 is the first mass
 * @param m2 is the second mass
 * @param r  is the distance between the centers of the masses
 * 
 * @returns F is the force between the masses
 */
function universalGravitation(m1, m2, r) {
    return G * (m1 * m2) / (r * r)
}

class OrbitalSystem {

    constructor(centralBody, centralBodyMu) {
        this.centralBody = centralBody
        this.centralBodyMu = centralBodyMu
        this.orbitingSystems = []
    }

    addOrbitingSystem(system) {
        this.orbitingSystems.push(system)
    }

    update() {
        /* Update central body */
        // to do

        /* Update orbiting systems */
        // for (let system of this.orbitingSystems) {}
    }

}

class Planet {

    constructor(id, x, y, mass, radius, material = material_1) {
        this.id = id

        this.pos = new THREE.Vector3(x, 0, y)
        this.vel = new THREE.Vector3(0, 0, 0)

        this.mass = mass
        this.radius = radius

        this.mesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8 * 4, 6 * 4),
            new THREE.MeshPhongMaterial({
                color: 'white',
                map: earth_tex_color,
                bumpMap: earth_tex_bump,
                bumpScale: 0.006 * this.radius,
                specularMap: earth_tex_spec
            }))

        this.atmosphere = new THREE.Mesh(
            new THREE.SphereGeometry(1, 8 * 4, 6 * 4),
            new THREE.MeshPhongMaterial({
                color: 'white',
                map: earth_clouds_tex,
                alphaMap: earth_clouds_tex,
                transparent: true
            }))

        // this.mesh.castShadow = true;
        this.mesh.scale.multiplyScalar(this.radius);
        this.atmosphere.scale.multiplyScalar(1.004 * this.radius);

        scene.add(this.mesh)
        scene.add(this.atmosphere)

        this.updateVisual()
    }

    computeGravitationalForce() {
        this.acc = new THREE.Vector3(0, 0, 0)

        for (let planet of planets) {
            if (planet.id == this.id) continue

            const distance = this.pos.distanceTo(planet.pos)
            const F = universalGravitation(this.mass, planet.mass, distance)
            this.F = F

            /**
             *  F = m * a
             *  and therefore,
             *  a = F / m
             */

            const a = F / this.mass

            const acc_vector = new THREE.Vector3().subVectors(planet.pos, this.pos).normalize().multiplyScalar(a)
            this.acc.add(acc_vector)
        }
    }

    computeNextState() {
        this.next_vel = new THREE.Vector3().addVectors(this.vel, this.acc)
        this.next_pos = new THREE.Vector3().addVectors(this.pos, this.next_vel)
    }

    applyNextState() {
        this.vel = this.next_vel
        this.pos = this.next_pos

        this.updateVisual()
    }

    updateVisual() {
        this.mesh.position.copy(this.pos)
    }

    get info() {
        return `Planet: ${this.id}:\n` +
            `  mass: ${this.mass} M☉\n` +
            `radius: ${this.radius} au\n`
        // `    F: ${this.F} N\n` +
        // `  pos: ${this.pos.toArray()}\n` + //.map(x => x.toFixed(4))
        // `  vel: ${this.vel.toArray()}\n` +
        // `  acc: ${this.acc.toArray()}`
    }

}

// This should print ~686 N.
// console.log(universalGravitation(5.98e24, 70, 6.38e6))

// console.log(StdGravParams.Earth)
console.log(SolarSystemDB)

/* Length */

/** Converts kilometres to astronomical units */
function km_to_astronomical_units(length) { return length * 6.6845871226706e-9 }

/** Converts astronomical units to kilometres */
function astronomical_units_to_km(length) { return length * 149597870.691 }

/* Mass */

/** Converts kilograms to solar masses */
function kg_to_solar_masses(mass) { return mass * 5.02785431e-31 }

/** Converts solar masses to kilograms */
function solar_masses_to_kg(mass) { return mass * 1.9889200011446e+30 }

/* - - - - - - - - - - - - - - - - */

let universe = null
let sun = null
let earth = null
let jupiter = null

function createBodyFromJSON(data) {
    return new Planet(data.name, 0, 0,
        kg_to_solar_masses(data.mass),
        km_to_astronomical_units(data.radius),
        material_2)
}

function initSolarSystem() {
    // earth = createBodyFromJSON(SolarSystemDB.Earth)
    // let orbsys_earth = new OrbitalSystem(earth, StdGravParams.Earth)

    // jupiter = createBodyFromJSON(SolarSystemDB.Jupiter)
    // let orbsys_jupiter = new OrbitalSystem(jupiter, StdGravParams.Jupiter)

    sun = createBodyFromJSON(SolarSystemDB.Sun)
    let solar_system = new OrbitalSystem(sun, StdGravParams.Sun)
    // solar_system.addOrbitingSystem(orbsys_earth)

    universe = solar_system

    console.log(sun.info)
    // console.log(earth.info)
    // console.log(jupiter.info)

    // computeGravitationalForces(planets)
    // for (let planet of planets) console.log(planet.info)
}

function computeGravitationalForces(planets) {
    for (let planet of planets) planet.computeGravitationalForce()
}

function computeNextStates(planets) {
    for (let planet of planets) planet.computeNextState()
}

function applyNextStates(planets) {
    for (let planet of planets) planet.applyNextState()
}

function updateWorld() {
    // computeGravitationalForces(planets)
    // computeNextStates(planets)
    // applyNextStates(planets)

    // for (let planet of planets) console.log(planet.info)
}

function animate() {
    requestAnimationFrame(animate)

    updateWorld()

    renderer.render(scene, camera)
    stats.update()
}

window.addEventListener('resize', onWindowResize, false)

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

window.addEventListener('keydown', function (event) {
    switch (event.keyCode) {
        case 48: // 0
            camera.position.set(0, 40, 0)
            cameraTarget.set(0, 0, 0)
            orbitControls.update()
            break
        case 49: // 1
            camera.position.set(0, 4 * sun.radius, 0)
            cameraTarget.copy(sun.pos)
            orbitControls.update()
            break
        case 50: // 2
            camera.position.set(0, 4 * earth.radius, 0)
            cameraTarget.copy(earth.pos)
            orbitControls.update()
            break
        case 53: // 5
            camera.position.set(0, 4 * jupiter.radius, 0)
            cameraTarget.copy(jupiter.pos)
            orbitControls.update()
            break
        case 65: // A
            break
        case 68: // D
            updateWorld()
            break
        case 83: // S
            break
        case 87: // W
            break
        default:
            console.log('Pressed key code: ' + event.keyCode)
            break
    }
})


/**
 * Gamepad-related stuff.
 */

/*
 * Connection / Disconnection
 */

gamepad.on('connect', e => {
    console.log(`Controller ${e.index} connected!`)
})

gamepad.on('disconnect', e => {
    console.log(`Controller ${e.index} disconnected!`)
})

/*
 * Stick movements
 */

gamepad.on('hold', 'stick_axis_left', e => {
    // mesh.position.x += e.value[0] * 0.1
    // mesh.position.z += e.value[1] * 0.1
})

gamepad.on('hold', 'stick_axis_right', e => {
    orbitControls.rotateLeft(e.value[0] * 0.05)
    orbitControls.rotateUp(e.value[1] * 0.03)
    orbitControls.update()
})
