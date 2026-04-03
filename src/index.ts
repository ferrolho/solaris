import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'stats.js'

import Body from './Body'
import { SolarSystemDB } from './SIConstants'
import * as ws from './Workspace'

// WebGL check
if (!navigator.gpu && !document.createElement('canvas').getContext('webgl2')) {
    document.body.innerText = 'WebGL is not supported in your browser.'
}

// Stats
const stats = new Stats()
stats.dom.id = 'statsjs'
document.body.appendChild(stats.dom)

// Disable sRGB color management to match legacy Three.js rendering
THREE.ColorManagement.enabled = false

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true })
renderer.outputColorSpace = THREE.LinearSRGBColorSpace
renderer.setPixelRatio(window.devicePixelRatio)
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true
document.getElementById('threejs-container')!.appendChild(renderer.domElement)

const cameraTarget = new THREE.Vector3(0, 0, 0)

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1e-6, 1e12)

// Orbit Controls
const orbitControls = new OrbitControls(camera, renderer.domElement)
orbitControls.target = cameraTarget
orbitControls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
orbitControls.screenSpacePanning = true
orbitControls.zoomSpeed = 0.8

camera.position.set(0, 40, 0)
camera.lookAt(cameraTarget)
orbitControls.update()

const skybox_tex = ws.textureLoader.load('/textures/stars_milky_way.jpg')

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

/* - - - - - - - - - - - - - - - - */

initSolarSystem()
animate()

function initSolarSystem(): void {
    for (const key in SolarSystemDB) {
        new Body(SolarSystemDB[key])
    }
}

function computeNextStates(): void {
    for (const key in ws.body_map) ws.body_map[key].computeNextState()
}

function applyNextStates(): void {
    for (const key in ws.body_map) ws.body_map[key].applyNextState()
}

function updateWorld(): void {
    ws.updateDelta()
    computeNextStates()
    applyNextStates()
}

function animate(): void {
    requestAnimationFrame(animate)

    pollGamepad()
    updateWorld()

    renderer.render(ws.scene, camera)
    stats.update()
}

window.addEventListener('resize', onWindowResize, false)

function onWindowResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    renderer.setSize(window.innerWidth, window.innerHeight)
}

function teleportTo(bodyName: string): void {
    const body = ws.body_map[bodyName]
    if (!body) return
    camera.position.copy(body.pos)
    camera.position.x += 4 * body.radius
    cameraTarget.copy(body.pos)
    orbitControls.update()
}

window.addEventListener('keydown', function (event: KeyboardEvent) {
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

window.addEventListener('gamepadconnected', (e: GamepadEvent) => {
    console.log(`Controller ${e.gamepad.index} connected: ${e.gamepad.id}`)
})

window.addEventListener('gamepaddisconnected', (e: GamepadEvent) => {
    console.log(`Controller ${e.gamepad.index} disconnected: ${e.gamepad.id}`)
})

function pollGamepad(): void {
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
