import * as THREE from 'three'
import * as ws from './Workspace'

/**
 * Schematic 2D minimap overlay showing the solar system from above.
 * Renders planet positions as colored dots on orbital rings with a
 * camera position indicator.
 */

const PLANET_COLORS: Record<string, string> = {
    sun: '#fffae6',
    mercury: '#b0a090',
    venus: '#e8cda0',
    earth: '#4488cc',
    moon: '#aaaaaa',
    mars: '#cc6644',
    jupiter: '#d4a56a',
    saturn: '#e8d088',
    uranus: '#88ccdd',
    neptune: '#5566cc',
}

const ORBIT_COLORS: Record<string, string> = {
    mercury: 'rgba(176,160,144,0.2)',
    venus: 'rgba(232,205,160,0.2)',
    earth: 'rgba(68,136,204,0.2)',
    mars: 'rgba(204,102,68,0.2)',
    jupiter: 'rgba(212,165,106,0.15)',
    saturn: 'rgba(232,208,136,0.15)',
    uranus: 'rgba(136,204,221,0.12)',
    neptune: 'rgba(85,102,204,0.12)',
}

// Neptune's semi-major axis in AU — used to scale the minimap
const NEPTUNE_AU = 30.07

export class Minimap {
    private canvas: HTMLCanvasElement
    private ctx: CanvasRenderingContext2D
    private size: number
    private camera: THREE.PerspectiveCamera
    private animTime = 0

    constructor(camera: THREE.PerspectiveCamera, size = 200) {
        this.camera = camera
        this.size = size

        this.canvas = document.createElement('canvas')
        this.canvas.width = size * window.devicePixelRatio
        this.canvas.height = size * window.devicePixelRatio
        this.canvas.style.width = `${size}px`
        this.canvas.style.height = `${size}px`
        this.canvas.style.position = 'fixed'
        this.canvas.style.bottom = '16px'
        this.canvas.style.left = '16px'
        this.canvas.style.borderRadius = '50%'
        this.canvas.style.border = '1px solid rgba(255,255,255,0.15)'
        this.canvas.style.background = 'rgba(0,0,0,0.7)'
        this.canvas.style.backdropFilter = 'blur(8px)'
        this.canvas.style.pointerEvents = 'none'
        this.canvas.style.zIndex = '100'

        document.body.appendChild(this.canvas)

        this.ctx = this.canvas.getContext('2d')!
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    update(dt: number): void {
        this.animTime += dt

        const ctx = this.ctx
        const s = this.size
        const cx = s / 2
        const cy = s / 2
        const margin = 14
        const mapRadius = s / 2 - margin

        // Clear
        ctx.save()
        ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
        ctx.clearRect(0, 0, s, s)

        // Clip to circle
        ctx.beginPath()
        ctx.arc(cx, cy, s / 2 - 1, 0, Math.PI * 2)
        ctx.clip()

        // Scale: map AU to pixels (Neptune at edge)
        const scale = mapRadius / (NEPTUNE_AU * 1.1)

        // Draw orbital rings
        for (const name of Object.keys(ORBIT_COLORS)) {
            const body = ws.body_map[name]
            if (!body) continue
            // Approximate orbital radius as current distance from Sun
            const dist = Math.sqrt(body.pos.x * body.pos.x + body.pos.z * body.pos.z)
            const r = dist * scale

            ctx.beginPath()
            ctx.arc(cx, cy, r, 0, Math.PI * 2)
            ctx.strokeStyle = ORBIT_COLORS[name]
            ctx.lineWidth = 1
            ctx.stroke()
        }

        // Draw Sun (glow)
        const sunGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 8)
        sunGlow.addColorStop(0, 'rgba(255,250,230,0.9)')
        sunGlow.addColorStop(0.4, 'rgba(255,220,100,0.4)')
        sunGlow.addColorStop(1, 'rgba(255,200,50,0)')
        ctx.beginPath()
        ctx.arc(cx, cy, 8, 0, Math.PI * 2)
        ctx.fillStyle = sunGlow
        ctx.fill()

        // Draw Sun core
        ctx.beginPath()
        ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = PLANET_COLORS.sun
        ctx.fill()

        // Draw planets
        for (const [name, color] of Object.entries(PLANET_COLORS)) {
            if (name === 'sun' || name === 'moon') continue
            const body = ws.body_map[name]
            if (!body) continue

            // pos.x and pos.z are the ecliptic plane in Three.js coordinates
            const px = cx + body.pos.x * scale
            const py = cy + body.pos.z * scale

            // Planet dot size — inner planets smaller, outer bigger
            const dist = Math.sqrt(body.pos.x * body.pos.x + body.pos.z * body.pos.z)
            const dotSize = dist > 5 ? 3 : 2

            // Subtle glow
            const glow = ctx.createRadialGradient(px, py, 0, px, py, dotSize * 3)
            glow.addColorStop(0, color.replace(')', ',0.5)').replace('rgb', 'rgba'))
            glow.addColorStop(1, 'rgba(0,0,0,0)')
            ctx.beginPath()
            ctx.arc(px, py, dotSize * 3, 0, Math.PI * 2)
            ctx.fillStyle = glow
            ctx.fill()

            // Planet dot
            ctx.beginPath()
            ctx.arc(px, py, dotSize, 0, Math.PI * 2)
            ctx.fillStyle = color
            ctx.fill()
        }

        // Draw Moon near Earth
        const earth = ws.body_map['earth']
        const moon = ws.body_map['moon']
        if (earth && moon) {
            // Exaggerate Moon's distance from Earth for visibility
            const dx = (moon.pos.x - earth.pos.x) * scale * 80
            const dz = (moon.pos.z - earth.pos.z) * scale * 80
            const mx = cx + earth.pos.x * scale + dx
            const my = cy + earth.pos.z * scale + dz

            ctx.beginPath()
            ctx.arc(mx, my, 1.5, 0, Math.PI * 2)
            ctx.fillStyle = PLANET_COLORS.moon
            ctx.fill()
        }

        // Draw camera indicator
        const camX = cx + this.camera.position.x * scale
        const camY = cy + this.camera.position.z * scale

        // Pulsing ring
        const pulse = 0.5 + 0.5 * Math.sin(this.animTime * 3)
        const ringRadius = 4 + pulse * 2

        ctx.beginPath()
        ctx.arc(camX, camY, ringRadius, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${0.3 + pulse * 0.3})`
        ctx.lineWidth = 1
        ctx.stroke()

        // Camera dot
        ctx.beginPath()
        ctx.arc(camX, camY, 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.fill()

        ctx.restore()
    }
}
