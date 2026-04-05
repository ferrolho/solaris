import * as THREE from 'three'
import type { ShipState } from './NetworkProtocol'

const INTERP_DELAY = 100 // ms — render this far behind real-time
const EXTRAPOLATE_MAX = 500 // ms — max extrapolation before freezing
const LABEL_CANVAS_W = 256
const LABEL_CANVAS_H = 64

interface BufferedState {
    state: ShipState
    receivedAt: number // performance.now()
}

export class RemotePlayer {
    readonly id: string
    username: string
    readonly mesh: THREE.Mesh
    readonly label: THREE.Sprite

    private buffer: BufferedState[] = []
    private labelCanvas: HTMLCanvasElement
    private labelTexture: THREE.CanvasTexture

    constructor(id: string, username: string, scene: THREE.Scene) {
        this.id = id
        this.username = username

        // Ship mesh — same shape as local but orange/amber tones
        const hull = new THREE.MeshBasicMaterial({ color: 0xddaa55 })
        const accent = new THREE.MeshBasicMaterial({ color: 0xff8800 })
        const engine = new THREE.MeshBasicMaterial({ color: 0xff4422 })

        const group = new THREE.Group()

        const fuselage = new THREE.Mesh(
            new THREE.ConeGeometry(0.25, 1.2, 6).rotateX(-Math.PI / 2),
            hull,
        )
        fuselage.position.z = -0.1
        group.add(fuselage)

        const wingGeo = new THREE.BoxGeometry(0.8, 0.04, 0.4)
        const leftWing = new THREE.Mesh(wingGeo, accent)
        leftWing.position.set(-0.5, 0, 0.15)
        leftWing.rotation.z = -0.15
        group.add(leftWing)

        const rightWing = new THREE.Mesh(wingGeo, accent)
        rightWing.position.set(0.5, 0, 0.15)
        rightWing.rotation.z = 0.15
        group.add(rightWing)

        const engineBlock = new THREE.Mesh(
            new THREE.BoxGeometry(0.2, 0.15, 0.2),
            engine,
        )
        engineBlock.position.z = 0.5
        group.add(engineBlock)

        this.mesh = new THREE.Mesh()
        this.mesh.add(group)
        this.mesh.scale.setScalar(1e-5)
        scene.add(this.mesh)

        // Name label sprite
        this.labelCanvas = document.createElement('canvas')
        this.labelCanvas.width = LABEL_CANVAS_W
        this.labelCanvas.height = LABEL_CANVAS_H
        this.labelTexture = new THREE.CanvasTexture(this.labelCanvas)
        this.labelTexture.minFilter = THREE.LinearFilter
        this.renderLabel()

        const spriteMat = new THREE.SpriteMaterial({
            map: this.labelTexture,
            depthTest: false,
            transparent: true,
        })
        this.label = new THREE.Sprite(spriteMat)
        this.label.scale.set(4e-5, 1e-5, 1) // wide aspect to fit text
        this.label.renderOrder = 1
        scene.add(this.label)
    }

    setUsername(name: string): void {
        this.username = name
        this.renderLabel()
    }

    pushState(state: ShipState): void {
        this.buffer.push({ state, receivedAt: performance.now() })
        // Keep buffer trimmed — only need last few states
        if (this.buffer.length > 10) {
            this.buffer.splice(0, this.buffer.length - 10)
        }
    }

    update(_delta: number): void {
        const now = performance.now()
        const renderTime = now - INTERP_DELAY

        if (this.buffer.length === 0) return

        // Find the two states bracketing renderTime
        let from: BufferedState | null = null
        let to: BufferedState | null = null
        for (let i = 0; i < this.buffer.length - 1; i++) {
            if (this.buffer[i].receivedAt <= renderTime && this.buffer[i + 1].receivedAt >= renderTime) {
                from = this.buffer[i]
                to = this.buffer[i + 1]
                break
            }
        }

        if (from && to) {
            // Interpolate between states
            const span = to.receivedAt - from.receivedAt
            const t = span > 0 ? (renderTime - from.receivedAt) / span : 0

            this.mesh.position.lerpVectors(
                new THREE.Vector3(from.state.px, from.state.py, from.state.pz),
                new THREE.Vector3(to.state.px, to.state.py, to.state.pz),
                t,
            )

            const qFrom = new THREE.Quaternion(from.state.qx, from.state.qy, from.state.qz, from.state.qw)
            const qTo = new THREE.Quaternion(to.state.qx, to.state.qy, to.state.qz, to.state.qw)
            this.mesh.quaternion.slerpQuaternions(qFrom, qTo, t)
        } else {
            // Use latest state, possibly extrapolate
            const latest = this.buffer[this.buffer.length - 1]
            const age = now - latest.receivedAt

            this.mesh.position.set(latest.state.px, latest.state.py, latest.state.pz)
            this.mesh.quaternion.set(latest.state.qx, latest.state.qy, latest.state.qz, latest.state.qw)

            if (age < EXTRAPOLATE_MAX) {
                // Extrapolate using velocity
                const dt = age / 1000
                this.mesh.position.x += latest.state.vx * dt
                this.mesh.position.y += latest.state.vy * dt
                this.mesh.position.z += latest.state.vz * dt
            }
        }

        // Position label above ship
        this.label.position.copy(this.mesh.position)
        this.label.position.y += this.mesh.scale.x * 1.5
    }

    dispose(scene: THREE.Scene): void {
        scene.remove(this.mesh)
        scene.remove(this.label)
        this.mesh.geometry.dispose()
        ;(this.mesh.material as THREE.Material).dispose()
        this.labelTexture.dispose()
        ;(this.label.material as THREE.SpriteMaterial).dispose()
    }

    private renderLabel(): void {
        const ctx = this.labelCanvas.getContext('2d')!
        ctx.clearRect(0, 0, LABEL_CANVAS_W, LABEL_CANVAS_H)

        ctx.font = '24px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillText(this.username, LABEL_CANVAS_W / 2, LABEL_CANVAS_H / 2)

        this.labelTexture.needsUpdate = true
    }
}
