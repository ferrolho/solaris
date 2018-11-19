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

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true;
$('#threejs-container').append(renderer.domElement)

let cameraTarget = new THREE.Vector3(0, 0, 0)

// Scene
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff);
// scene.fog = new THREE.Fog(0x000, 0, 100);

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 9000e5)

// Orbit Controls
const orbitControls = new THREE.OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.enableKeys = false
orbitControls.mouseButtons = { ORBIT: THREE.MOUSE.LEFT, PAN: THREE.MOUSE.MIDDLE, ZOOM: THREE.MOUSE.RIGHT }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8

camera.position.set(0, 400e6, 0)
camera.lookAt(cameraTarget)
orbitControls.update()

$(document).ready(function () {
    init()
    animate()
})

function init() {
    // Axes Helper
    const axis = new THREE.AxesHelper(9371e3)
    scene.add(axis)

    // Grid Helper
    const grid = new THREE.GridHelper(384402e3 * 2, 40)
    grid.material.color.setHex(0x000000)
    grid.material.opacity = 0.1
    grid.material.transparent = true
    scene.add(grid)


    // Lights

    let light = new THREE.HemisphereLight(0xffffff, 0x444444)

    let sun = new THREE.DirectionalLight(0xffffff);
    sun.position.set(0, 20, 10)
    sun.castShadow = true;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.radius = 0.2;

    scene.add(light)
    scene.add(sun)

    scene.add(new THREE.CameraHelper(sun.shadow.camera));

    addPlanets()
}

const material_1 = new THREE.MeshLambertMaterial({ color: 0x118844 })
const material_2 = new THREE.MeshLambertMaterial({ color: 0x333333 })

/**
 * G is the gravitational constant (6.674×10−11 N · (m/kg)2).
 * https://en.wikipedia.org/wiki/Gravitational_constant
 */
const G = 6.674e-11

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

class Planet {

    constructor(id, x, y, mass, radius, material = material_1) {
        this.id = id

        this.pos = new THREE.Vector3(x, 0, y)
        this.vel = new THREE.Vector3(0, 0, 0)

        this.mass = mass

        const geometry = new THREE.SphereGeometry(radius, 24, 18)
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.castShadow = true;
        scene.add(this.mesh)

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
        return `Planet ${this.id}:\n` +
            ` mass: ${this.mass} kg\n` +
            `    F: ${this.F} N\n` +
            `  pos: ${this.pos.toArray()}\n` + //.map(x => x.toFixed(4))
            `  vel: ${this.vel.toArray()}\n` +
            `  acc: ${this.acc.toArray()}`
    }

}

// This should print ~686 N.
// console.log(universalGravitation(5.98e24, 70, 6.38e6))

let planets = []

const earth = new Planet(0, 0, 0, 5.972e24, 6371e3)  // green
const moon = new Planet(1, 384402e3, 0, 7.342e22, 1737.1e3, material_2) // grey

function addPlanets() {
    moon.vel.setZ(1.022e3)

    planets.push(earth)
    planets.push(moon)

    computeGravitationalForces(planets)
    for (let planet of planets) console.log(planet.info)
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
    computeGravitationalForces(planets)
    computeNextStates(planets)
    applyNextStates(planets)

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
            camera.position.set(0, 400e6, 0)
            cameraTarget.set(0, 0, 0)
            orbitControls.update()
            break
        case 49: // 1
            cameraTarget.copy(moon.pos)
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
