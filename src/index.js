import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'stats.js'

import Body from './Body.js'
import { SolarSystemDB, StdGravParams } from './SIConstants.js'
import * as ws from './Workspace.js'

// WebGL check
if (!navigator.gpu && !document.createElement('canvas').getContext('webgl2')) {
    document.body.innerText = 'WebGL is not supported in your browser.'
}

// Stats
const stats = new Stats()
stats.dom.id = 'statsjs'
document.body.appendChild(stats.dom)

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.getElementById('threejs-container').appendChild(renderer.domElement)

let cameraTarget = new THREE.Vector3(0, 0, 0)

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1e-6)

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
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

initSolarSystem()
animate()

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
}

function animate() {
    requestAnimationFrame(animate)

    pollGamepad()
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
    switch (event.key) {
        case '0': teleportTo('sun'); break
        case '1': teleportTo('mercury'); break
        case '2': teleportTo('venus'); break
        case '3': teleportTo('earth'); break
        case '4': teleportTo('mars'); break
        case '5': teleportTo('jupiter'); break
        case '6': teleportTo('saturn'); break
        case '7': teleportTo('uranus'); break
        case '8': teleportTo('neptune'); break
        case '9': teleportTo('pluto'); break
        case 'd': case 'D': updateWorld(); break
    }
})

/**
 * Gamepad support (native Gamepad API)
 */

window.addEventListener('gamepadconnected', e => {
    console.log(`Controller ${e.gamepad.index} connected: ${e.gamepad.id}`)
})

window.addEventListener('gamepaddisconnected', e => {
    console.log(`Controller ${e.gamepad.index} disconnected: ${e.gamepad.id}`)
})

function pollGamepad() {
    const gamepads = navigator.getGamepads()
    for (const gp of gamepads) {
        if (!gp) continue
        // Right stick: axes[2] (horizontal), axes[3] (vertical)
        const deadzone = 0.15
        const rx = Math.abs(gp.axes[2]) > deadzone ? gp.axes[2] : 0
        const ry = Math.abs(gp.axes[3]) > deadzone ? gp.axes[3] : 0
        if (rx || ry) {
            orbitControls.rotateLeft(rx * 0.05)
            orbitControls.rotateUp(ry * 0.03)
            orbitControls.update()
        }
    }
}
