import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Ship } from './Ship'

export type CameraMode = 'observer' | 'chase' | 'cockpit'

// Chase cam offset in AU — behind (+Z) and above (+Y) the ship (ship faces -Z)
const CHASE_OFFSET = new THREE.Vector3(0, 1.5e-5, 4e-5)

const CHASE_LERP_RATE = 12       // per second — smooth follow
const CHASE_MAX_LAG = 3e-5       // AU — max distance camera can fall behind target

const _targetPos = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _lookAt = new THREE.Vector3()
const _shipUp = new THREE.Vector3()

const MODE_LABELS: Record<CameraMode, string> = {
    observer: 'OBSERVER',
    chase: 'CHASE',
    cockpit: 'COCKPIT',
}

export class CameraController {
    mode: CameraMode = 'observer'

    private camera: THREE.PerspectiveCamera
    private orbitControls: OrbitControls
    private ship: Ship
    private badgeEl: HTMLDivElement

    constructor(
        camera: THREE.PerspectiveCamera,
        orbitControls: OrbitControls,
        ship: Ship,
    ) {
        this.camera = camera
        this.orbitControls = orbitControls
        this.ship = ship

        // Camera mode badge — top-center of screen
        this.badgeEl = document.createElement('div')
        Object.assign(this.badgeEl.style, {
            position: 'fixed',
            top: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 12px',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: '100',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontSize: '9px',
            letterSpacing: '2px',
            color: 'rgba(120, 180, 255, 0.7)',
        })
        this.badgeEl.textContent = MODE_LABELS[this.mode]
        document.body.appendChild(this.badgeEl)
    }

    cycleMode(): void {
        const modes: CameraMode[] = ['observer', 'chase', 'cockpit']
        const idx = modes.indexOf(this.mode)
        this.setMode(modes[(idx + 1) % modes.length])
    }

    setMode(mode: CameraMode): void {
        const prev = this.mode
        this.mode = mode

        if (mode === 'observer') {
            this.ship.mesh.visible = true
            this.camera.up.set(0, 1, 0) // reset to world up for OrbitControls
            this.orbitControls.target.copy(this.ship.position)
            this.orbitControls.enabled = true
            this.orbitControls.update()
        } else if (mode === 'chase') {
            this.ship.mesh.visible = true
            this.orbitControls.enabled = false
            // Snap camera to chase position immediately on mode switch
            this.computeChaseTarget(_targetPos)
            this.camera.position.copy(_targetPos)
            this.ship.getForward(_lookAt).multiplyScalar(2e-5).add(this.ship.position)
            this.camera.lookAt(_lookAt)
        } else if (mode === 'cockpit') {
            this.ship.mesh.visible = false
            this.orbitControls.enabled = false
        }

        if (prev !== mode) {
            this.badgeEl.textContent = MODE_LABELS[mode]
            console.log(`[Camera] ${mode}`)
        }
    }

    update(delta: number): void {
        if (this.mode === 'chase') {
            this.updateChase(delta)
        } else if (this.mode === 'cockpit') {
            this.updateCockpit()
        }
        // observer mode: OrbitControls handles everything
    }

    private updateChase(delta: number): void {
        this.computeChaseTarget(_targetPos)

        // Smooth lerp follow
        const t = 1 - Math.exp(-CHASE_LERP_RATE * delta)
        this.camera.position.lerp(_targetPos, t)

        // Clamp: if camera drifted too far, pull it back to max distance
        const lag = this.camera.position.distanceTo(_targetPos)
        if (lag > CHASE_MAX_LAG) {
            this.camera.position.lerp(_targetPos, 1 - CHASE_MAX_LAG / lag)
        }

        // Align camera up with ship's local up so roll is visible
        this.ship.getUp(_shipUp)
        this.camera.up.copy(_shipUp)

        // Look at a point slightly ahead of the ship
        this.ship.getForward(_lookAt).multiplyScalar(2e-5)
        _lookAt.add(this.ship.position)
        this.camera.lookAt(_lookAt)
    }

    private updateCockpit(): void {
        this.camera.position.copy(this.ship.position)
        this.camera.quaternion.copy(this.ship.quaternion)
    }

    private computeChaseTarget(out: THREE.Vector3): void {
        // Offset in ship-local space (AU), rotated to world space
        _offset.copy(CHASE_OFFSET).applyQuaternion(this.ship.quaternion)
        out.copy(this.ship.position).add(_offset)
    }
}
