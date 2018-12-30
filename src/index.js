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

import Body from './Body'
import SolarSystemDB from './SIConstants'
import StdGravParams from './SIConstants'
import * as Utils from './Utilities'
import * as ws from './Workspace'

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true;
$('#threejs-container').append(renderer.domElement)

let cameraTarget = new THREE.Vector3(0, 0, 0)

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

const skybox_tex = ws.textureLoader.load('./textures/stars_milky_way.jpg')

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

ws.scene.add(skybox)

$(document).ready(function () {
    init()
    animate()
})

function init() {
    // Grid Helper
    // const grid = new THREE.GridHelper(10, 40)
    // grid.material.color.setHex(0xffffff)
    // grid.material.opacity = 0.4
    // grid.material.transparent = true
    // ws.scene.add(grid)

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

// This should print ~686 N.
// console.log(universalGravitation(5.98e24, 70, 6.38e6))

// console.log(StdGravParams.Earth)
// console.log(SolarSystemDB)

/* - - - - - - - - - - - - - - - - */

function initSolarSystem() {
    const mercury = new Body(SolarSystemDB.Mercury)
    let orbsys_mercury = new OrbitalSystem(mercury, StdGravParams.Mercury)

    const venus = new Body(SolarSystemDB.Venus)
    let orbsys_venus = new OrbitalSystem(venus, StdGravParams.Venus)

    const mars = new Body(SolarSystemDB.Mars)
    let orbsys_mars = new OrbitalSystem(mars, StdGravParams.Mars)

    const jupiter = new Body(SolarSystemDB.Jupiter)
    let orbsys_jupiter = new OrbitalSystem(jupiter, StdGravParams.Jupiter)

    const saturn = new Body(SolarSystemDB.Saturn)
    let orbsys_saturn = new OrbitalSystem(saturn, StdGravParams.Saturn)

    const uranus = new Body(SolarSystemDB.Uranus)
    let orbsys_uranus = new OrbitalSystem(uranus, StdGravParams.Uranus)

    const neptune = new Body(SolarSystemDB.Neptune)
    let orbsys_neptune = new OrbitalSystem(neptune, StdGravParams.Neptune)

    const pluto = new Body(SolarSystemDB.Pluto)
    let orbsys_pluto = new OrbitalSystem(pluto, StdGravParams.Pluto)

    /* Earth and Moon */

    const moon = new Body(SolarSystemDB.Moon)
    let orbsys_moon = new OrbitalSystem(moon, StdGravParams.Moon)

    const earth = new Body(SolarSystemDB.Earth)
    let orbsys_earth = new OrbitalSystem(earth, StdGravParams.Earth)
    orbsys_earth.addOrbitingSystem(orbsys_moon)

    /* Solar System */

    const sun = new Body(SolarSystemDB.Sun)
    let solar_system = new OrbitalSystem(sun, StdGravParams.Sun)
    solar_system.addOrbitingSystem(orbsys_mercury)
    solar_system.addOrbitingSystem(orbsys_venus)
    solar_system.addOrbitingSystem(orbsys_earth)
    solar_system.addOrbitingSystem(orbsys_mars)
    solar_system.addOrbitingSystem(orbsys_jupiter)
    solar_system.addOrbitingSystem(orbsys_saturn)
    solar_system.addOrbitingSystem(orbsys_uranus)
    solar_system.addOrbitingSystem(orbsys_neptune)

    // for (const i in ws.body_map) console.log(ws.body_map[i].info)

    // computeGravitationalForces(planets)
    // for (let planet of planets) console.log(planet.info)
}

function computeGravitationalForces() {
    for (const key in ws.body_map) ws.body_map[key].computeGravitationalForce()
}

function computeNextStates() {
    for (const key in ws.body_map) ws.body_map[key].computeNextState()
}

function applyNextStates() {
    for (const key in ws.body_map) ws.body_map[key].applyNextState()
}

function updateWorld() {
    ws.delta = ws.clock.getDelta()

    // computeGravitationalForces()
    computeNextStates()
    applyNextStates()

    // console.log(ws.delta)
    // console.log(ws.body_map['earth'].info)

    // for (const key of ws.body_map) ws.body_map[key].log(planet.info)
}

function animate() {
    requestAnimationFrame(animate)

    updateWorld()

    renderer.render(ws.scene, camera)
    stats.update()
}

window.addEventListener('resize', onWindowResize, false)

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function teleportTo(bodyName) {
    camera.position.copy(ws.body_map[bodyName].pos)
    camera.position.x += 4 * ws.body_map[bodyName].radius
    cameraTarget.copy(ws.body_map[bodyName].pos)
    orbitControls.update()
}

window.addEventListener('keydown', function (event) {
    switch (event.keyCode) {
        case 48: // 0
            teleportTo('sun')
            break
        case 49: // 1
            teleportTo('mercury')
            break
        case 50: // 2
            teleportTo('venus')
            break
        case 51: // 3
            teleportTo('earth')
            break
        case 52: // 4
            teleportTo('mars')
            // teleportTo('moon')
            break
        case 53: // 5
            teleportTo('jupiter')
            break
        case 54: // 6
            teleportTo('saturn')
            break
        case 55: // 7
            teleportTo('uranus')
            break
        case 56: // 8
            teleportTo('neptune')
            break
        case 57: // 9
            teleportTo('pluto')
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
