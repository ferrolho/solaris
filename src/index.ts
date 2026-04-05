import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import Stats from 'stats.js'

import Body from './Body'
import { SolarSystemDB } from './SIConstants'
import { computeEphemerisForDate } from './Ephemeris'
import { Hud } from './Hud'
import { Minimap } from './Minimap'
import { Ship } from './Ship'
import { InputManager } from './InputManager'
import { CameraController } from './CameraController'
import { getIdentity } from './PlayerIdentity'
import { NetworkClient } from './NetworkClient'
import { SettingsPanel } from './SettingsPanel'
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

// Camera position is set after initSolarSystem() to start near Earth

const skybox_tex = ws.textureLoader.load('textures/stars_milky_way.jpg')
skybox_tex.mapping = THREE.EquirectangularReflectionMapping
ws.scene.background = skybox_tex

/* - - - - - - - - - - - - - - - - */

// Compute real-time planet positions for the current date
const ephemeris = computeEphemerisForDate(new Date())
for (const key in SolarSystemDB) {
    if (ephemeris[key]) {
        SolarSystemDB[key].ephemeris = ephemeris[key]
    }
}

initSolarSystem()

{
    const sun = ws.body_map['sun'], earth = ws.body_map['earth']
    const sunDir = new THREE.Vector3().subVectors(sun.pos, earth.pos).normalize()
    const invQ = earth.mesh.quaternion.clone().invert()
    const sunBody = sunDir.clone().applyQuaternion(invQ)
    const lon = Math.atan2(-sunBody.z, sunBody.x) * 180 / Math.PI
    const lat = Math.asin(Math.max(-1, Math.min(1, sunBody.y))) * 180 / Math.PI
    const now = new Date()
    const utcH = now.getUTCHours() + now.getUTCMinutes() / 60
    const expected = (12 - utcH) * 15
    console.log(`[Earth] UTC: ${now.toISOString()} | sub-solar: lon=${lon.toFixed(1)}° lat=${lat.toFixed(1)}° | expected lon: ${expected.toFixed(1)}°`)
}

const { id: localId, username: localUsername } = getIdentity()
const inputManager = new InputManager()
const ship = new Ship(ws.scene, ws.body_map['earth'])
const cameraCtrl = new CameraController(camera, orbitControls, ship)

// @ts-expect-error Vite injects import.meta.env at build time
const wsUrl: string = import.meta.env?.VITE_WS_URL ?? 'ws://localhost:8080'
const network = new NetworkClient(wsUrl, localId, localUsername, ws.scene)
network.connect()
network.startSendLoop(ship)
const _settings = new SettingsPanel(network)

teleportTo('earth')
const hud = new Hud(camera)
const minimap = new Minimap(camera)
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

    if (cameraCtrl.mode !== 'observer') {
        ship.update(ws.delta, inputManager.keysDown)
    }
    cameraCtrl.update(ws.delta)
    network.update(ws.delta)

    renderer.render(ws.scene, camera)
    hud.update()
    minimap.update(ws.delta)
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
    const sun = ws.body_map['sun']
    if (body === sun) {
        // Sun: offset camera along an arbitrary axis
        camera.position.copy(body.pos).add(new THREE.Vector3(0, 0, 4 * body.radius))
    } else {
        // Place camera along the Sun→body line, looking at the body from the Sun's side
        const dirFromSun = new THREE.Vector3().subVectors(body.pos, sun.pos).normalize()
        camera.position.copy(body.pos).addScaledVector(dirFromSun, -4 * body.radius)
    }
    cameraTarget.copy(body.pos)
    orbitControls.update()
}

window.addEventListener('keydown', function (event: KeyboardEvent) {
    switch (event.key) {
        case 'Tab':
            event.preventDefault()
            cameraCtrl.cycleMode()
            break
        // Teleport keys only in observer mode
        case '0': if (cameraCtrl.mode === 'observer') teleportTo('sun'); break
        case '1': if (cameraCtrl.mode === 'observer') teleportTo('mercury'); break
        case '2': if (cameraCtrl.mode === 'observer') teleportTo('venus'); break
        case '3': if (cameraCtrl.mode === 'observer') teleportTo('earth'); break
        case '4': if (cameraCtrl.mode === 'observer') teleportTo('mars'); break
        case '5': if (cameraCtrl.mode === 'observer') teleportTo('jupiter'); break
        case '6': if (cameraCtrl.mode === 'observer') teleportTo('saturn'); break
        case '7': if (cameraCtrl.mode === 'observer') teleportTo('uranus'); break
        case '8': if (cameraCtrl.mode === 'observer') teleportTo('neptune'); break
        case '9': if (cameraCtrl.mode === 'observer') teleportTo('pluto'); break
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
