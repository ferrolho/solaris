import * as THREE from 'three'
import type { ShipState } from './NetworkProtocol'

const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()

// Ship size in AU (~1.5 km — large enough to see near planets)
const SHIP_SCALE = 1e-5

// Thrust in AU/s² — cruise ~0.001 AU/s, boost ~0.01 AU/s
const THRUST = 5e-4
const BOOST_MULT = 10
const DAMPING = 0.995      // per-frame velocity damping when not thrusting
const YAW_RATE = 1.5       // rad/s
const PITCH_RATE = 1.5
const ROLL_RATE = 1.5

export class Ship {
    readonly mesh: THREE.Mesh
    readonly position = new THREE.Vector3()
    readonly velocity = new THREE.Vector3()
    readonly quaternion = new THREE.Quaternion()
    private currentThrust = 0

    constructor(scene: THREE.Scene, spawnNear: { pos: THREE.Vector3; radius: number }) {
        // Cone pointing along -Z (forward matches Three.js camera convention)
        const geo = new THREE.ConeGeometry(0.4, 1, 8)
        geo.rotateX(-Math.PI / 2) // tip along -Z

        const mat = new THREE.MeshBasicMaterial({
            color: 0x44aaff,
            wireframe: true,
        })
        this.mesh = new THREE.Mesh(geo, mat)
        this.mesh.scale.setScalar(SHIP_SCALE)

        // Spawn near the reference body, offset along +Y
        this.position.copy(spawnNear.pos)
        this.position.y += spawnNear.radius * 5

        this.syncMesh()
        scene.add(this.mesh)
    }

    /** Advance ship physics for one frame. */
    update(delta: number, keys: Set<string>): void {
        if (delta <= 0) return

        const boost = keys.has('Shift') ? BOOST_MULT : 1

        // Rotation
        const yaw = ((keys.has('a') || keys.has('A')) ? 1 : 0) - ((keys.has('d') || keys.has('D')) ? 1 : 0)
        const pitch = ((keys.has('ArrowUp')) ? 1 : 0) - ((keys.has('ArrowDown')) ? 1 : 0)
        const roll = ((keys.has('q') || keys.has('Q')) ? 1 : 0) - ((keys.has('e') || keys.has('E')) ? 1 : 0)

        if (yaw)  this.rotateLocal(0, 1, 0, yaw * YAW_RATE * delta)
        if (pitch) this.rotateLocal(1, 0, 0, pitch * PITCH_RATE * delta)
        if (roll) this.rotateLocal(0, 0, 1, roll * ROLL_RATE * delta)

        // Thrust along local forward (-Z)
        const thrustFwd = ((keys.has('w') || keys.has('W')) ? 1 : 0) - ((keys.has('s') || keys.has('S')) ? 1 : 0)
        this.currentThrust = thrustFwd * THRUST * boost

        if (thrustFwd !== 0) {
            this.getForward(_forward)
            this.velocity.addScaledVector(_forward, this.currentThrust * delta)
        } else {
            // Damping when coasting
            const d = Math.pow(DAMPING, delta * 60) // normalise to ~60fps
            this.velocity.multiplyScalar(d)
        }

        this.position.addScaledVector(this.velocity, delta)
        this.syncMesh()
    }

    getState(): ShipState {
        const p = this.position
        const q = this.quaternion
        const v = this.velocity
        return {
            px: p.x, py: p.y, pz: p.z,
            qx: q.x, qy: q.y, qz: q.z, qw: q.w,
            vx: v.x, vy: v.y, vz: v.z,
            thrust: this.currentThrust,
            timestamp: performance.now(),
        }
    }

    getForward(out: THREE.Vector3): THREE.Vector3 {
        return out.set(0, 0, -1).applyQuaternion(this.quaternion)
    }

    getRight(out: THREE.Vector3): THREE.Vector3 {
        return out.set(1, 0, 0).applyQuaternion(this.quaternion)
    }

    getUp(out: THREE.Vector3): THREE.Vector3 {
        return out.set(0, 1, 0).applyQuaternion(this.quaternion)
    }

    private rotateLocal(x: number, y: number, z: number, angle: number): void {
        const q = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(x, y, z).applyQuaternion(this.quaternion).normalize(),
            angle,
        )
        this.quaternion.premultiply(q).normalize()
    }

    private syncMesh(): void {
        this.mesh.position.copy(this.position)
        this.mesh.quaternion.copy(this.quaternion)
    }
}
