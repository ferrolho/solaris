import type { Ship } from './Ship'
import type { CameraController, CameraMode } from './CameraController'

const AU_KM = 149597870.691

/**
 * Cockpit overlay — crosshair and speed readout shown only in cockpit mode.
 */
export class CockpitHud {
    private el: HTMLDivElement
    private speedEl: HTMLDivElement
    private ship: Ship
    private cameraCtrl: CameraController

    constructor(ship: Ship, cameraCtrl: CameraController) {
        this.ship = ship
        this.cameraCtrl = cameraCtrl

        // Container — centered, full-screen overlay
        this.el = document.createElement('div')
        Object.assign(this.el.style, {
            position: 'fixed',
            inset: '0',
            pointerEvents: 'none',
            zIndex: '100',
            display: 'none',
        })

        // Crosshair
        const crosshair = document.createElement('div')
        Object.assign(crosshair.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            border: '1px solid rgba(120, 180, 255, 0.35)',
            borderRadius: '50%',
        })
        // Center dot
        const dot = document.createElement('div')
        Object.assign(dot.style, {
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '2px',
            height: '2px',
            background: 'rgba(120, 180, 255, 0.6)',
            borderRadius: '50%',
        })
        crosshair.appendChild(dot)
        this.el.appendChild(crosshair)

        // Speed readout — bottom center
        this.speedEl = document.createElement('div')
        Object.assign(this.speedEl.style, {
            position: 'absolute',
            bottom: '48px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.55)',
            letterSpacing: '1px',
            textAlign: 'center',
        })
        this.el.appendChild(this.speedEl)

        // Mode indicator — top center
        const modeLabel = document.createElement('div')
        Object.assign(modeLabel.style, {
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontSize: '9px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(120, 180, 255, 0.4)',
        })
        modeLabel.textContent = 'cockpit'
        this.el.appendChild(modeLabel)

        document.body.appendChild(this.el)
    }

    update(): void {
        const show = this.cameraCtrl.mode === 'cockpit'
        this.el.style.display = show ? 'block' : 'none'
        if (!show) return

        const speed = this.ship.velocity.length() // AU/s
        const speedKms = speed * AU_KM // km/s

        let speedStr: string
        if (speedKms < 1) {
            speedStr = `${(speedKms * 1000).toFixed(0)} m/s`
        } else if (speedKms < 1000) {
            speedStr = `${speedKms.toFixed(1)} km/s`
        } else {
            speedStr = `${(speedKms / 1000).toFixed(2)}k km/s`
        }

        this.speedEl.textContent = speedStr
    }
}
