import * as THREE from 'three'
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Ship } from './Ship'

export type CameraMode = 'observer' | 'chase' | 'cockpit'

const CHASE_OFFSET = new THREE.Vector3(0, 0.3, -1.0) // local space: above & behind (tight follow)
const CHASE_LERP_RATE = 16 // per second — snappy tracking

const _targetPos = new THREE.Vector3()
const _offset = new THREE.Vector3()
const _lookAt = new THREE.Vector3()

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
            this.orbitControls.target.copy(this.ship.position)
            this.orbitControls.enabled = true
            this.orbitControls.update()
        } else if (mode === 'chase') {
            this.ship.mesh.visible = true
            this.orbitControls.enabled = false
            // Snap camera to chase position immediately on mode switch
            this.computeChaseTarget(_targetPos)
            this.camera.position.copy(_targetPos)
            this.ship.getForward(_lookAt).multiplyScalar(2).add(this.ship.position)
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

        // Smooth follow
        const t = 1 - Math.exp(-CHASE_LERP_RATE * delta)
        this.camera.position.lerp(_targetPos, t)

        // Look at a point slightly ahead of the ship
        this.ship.getForward(_lookAt).multiplyScalar(CHASE_OFFSET.z * -0.3)
        _lookAt.add(this.ship.position)
        this.camera.lookAt(_lookAt)
    }

    private updateCockpit(): void {
        this.camera.position.copy(this.ship.position)
        this.camera.quaternion.copy(this.ship.quaternion)
    }

    private computeChaseTarget(out: THREE.Vector3): void {
        // Offset in ship-local space, scaled by ship mesh size
        const scale = this.ship.mesh.scale.x
        _offset.copy(CHASE_OFFSET).multiplyScalar(scale)
        _offset.applyQuaternion(this.ship.quaternion)
        out.copy(this.ship.position).add(_offset)
    }
}
