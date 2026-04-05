import * as THREE from 'three'
import * as ws from './Workspace'

const AU_KM = 149597870.691

/**
 * Proximity HUD overlay — shows the nearest celestial body
 * and distance from the camera.
 */
export class Hud {
    private el: HTMLDivElement
    private nameEl: HTMLDivElement
    private distEl: HTMLDivElement
    private camera: THREE.PerspectiveCamera
    private scanlineEl: HTMLDivElement

    constructor(camera: THREE.PerspectiveCamera) {
        this.camera = camera

        // Container
        this.el = document.createElement('div')
        Object.assign(this.el.style, {
            position: 'fixed',
            bottom: '232px',
            left: '16px',
            width: '200px',
            padding: '12px 14px',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: '100',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            color: 'rgba(255, 255, 255, 0.85)',
            overflow: 'hidden',
        })

        // Subtle top-edge glow line
        this.scanlineEl = document.createElement('div')
        Object.assign(this.scanlineEl.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            right: '0',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(120, 180, 255, 0.4), transparent)',
        })
        this.el.appendChild(this.scanlineEl)

        // Label
        const label = document.createElement('div')
        Object.assign(label.style, {
            fontSize: '9px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(120, 180, 255, 0.5)',
            marginBottom: '6px',
        })
        label.textContent = 'nearest'
        this.el.appendChild(label)

        // Body name
        this.nameEl = document.createElement('div')
        Object.assign(this.nameEl.style, {
            fontSize: '15px',
            fontWeight: '500',
            letterSpacing: '1px',
            marginBottom: '6px',
            color: 'rgba(255, 255, 255, 0.95)',
        })
        this.nameEl.textContent = '—'
        this.el.appendChild(this.nameEl)

        // Distance
        this.distEl = document.createElement('div')
        Object.assign(this.distEl.style, {
            fontSize: '11px',
            lineHeight: '1.6',
            color: 'rgba(255, 255, 255, 0.55)',
        })
        this.distEl.textContent = ''
        this.el.appendChild(this.distEl)

        document.body.appendChild(this.el)
    }

    update(): void {
        const camPos = this.camera.position

        let nearestName = ''
        let nearestDist = Infinity

        for (const key in ws.body_map) {
            const body = ws.body_map[key]
            const d = camPos.distanceTo(body.pos)
            if (d < nearestDist) {
                nearestDist = d
                nearestName = body.name
            }
        }

        if (!nearestName) return

        this.nameEl.textContent = nearestName

        const km = nearestDist * AU_KM
        const auStr = nearestDist < 0.01
            ? `${(nearestDist * 1000).toFixed(2)} mAU`
            : `${nearestDist.toFixed(4)} AU`

        let kmStr: string
        if (km < 1000) {
            kmStr = `${km.toFixed(0)} km`
        } else if (km < 1e6) {
            kmStr = `${(km / 1000).toFixed(1)}k km`
        } else if (km < 1e9) {
            kmStr = `${(km / 1e6).toFixed(2)}M km`
        } else {
            kmStr = `${(km / 1e9).toFixed(2)}B km`
        }

        this.distEl.textContent = `${auStr}  ·  ${kmStr}`
    }
}
