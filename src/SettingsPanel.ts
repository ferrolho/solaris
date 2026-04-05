import type { NetworkClient } from './NetworkClient'
import { getUsername, setUsername } from './PlayerIdentity'

/**
 * Small gear-icon settings panel for editing username
 * and viewing connection status.
 */
export class SettingsPanel {
    private panel: HTMLDivElement
    private statusEl: HTMLDivElement
    private network: NetworkClient
    private visible = false

    constructor(network: NetworkClient) {
        this.network = network

        // Gear button
        const btn = document.createElement('button')
        Object.assign(btn.style, {
            position: 'fixed',
            bottom: '12px',
            right: '12px',
            width: '34px',
            height: '34px',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '16px',
            cursor: 'pointer',
            zIndex: '200',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            lineHeight: '34px',
            textAlign: 'center',
            padding: '0',
        })
        btn.textContent = '\u2699' // gear unicode
        btn.addEventListener('click', () => this.toggle())
        document.body.appendChild(btn)

        // Hint label next to gear
        const hint = document.createElement('div')
        Object.assign(hint.style, {
            position: 'fixed',
            bottom: '20px',
            right: '54px',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.3)',
            pointerEvents: 'none',
            zIndex: '200',
        })
        hint.textContent = '? for controls'
        document.body.appendChild(hint)

        // Panel
        this.panel = document.createElement('div')
        Object.assign(this.panel.style, {
            position: 'fixed',
            bottom: '52px',
            right: '12px',
            width: '220px',
            padding: '12px 14px',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            zIndex: '200',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            color: 'rgba(255, 255, 255, 0.85)',
            display: 'none',
        })

        // Accent line
        const scanline = document.createElement('div')
        Object.assign(scanline.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(120, 180, 255, 0.4), transparent)',
        })
        this.panel.appendChild(scanline)

        // Label
        const label = document.createElement('div')
        Object.assign(label.style, {
            fontSize: '9px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(120, 180, 255, 0.5)',
            marginBottom: '8px',
        })
        label.textContent = 'callsign'
        this.panel.appendChild(label)

        // Name input
        const input = document.createElement('input')
        Object.assign(input.style, {
            width: '100%',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            padding: '6px 8px',
            color: 'rgba(255, 255, 255, 0.95)',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            fontSize: '13px',
            outline: 'none',
            boxSizing: 'border-box',
        })
        input.type = 'text'
        input.maxLength = 24
        input.value = getUsername()
        input.addEventListener('change', () => {
            const name = input.value.trim()
            if (name) {
                setUsername(name)
                this.network.rename(name)
            }
        })
        // Prevent ship controls from firing while typing
        input.addEventListener('keydown', (e) => e.stopPropagation())
        this.panel.appendChild(input)

        // Connection status
        this.statusEl = document.createElement('div')
        Object.assign(this.statusEl.style, {
            fontSize: '10px',
            color: 'rgba(255, 255, 255, 0.4)',
            marginTop: '10px',
        })
        this.panel.appendChild(this.statusEl)

        document.body.appendChild(this.panel)

        // Update status periodically
        setInterval(() => this.updateStatus(), 2000)
        this.updateStatus()
    }

    private toggle(): void {
        this.visible = !this.visible
        this.panel.style.display = this.visible ? 'block' : 'none'
        if (this.visible) this.updateStatus()
    }

    private updateStatus(): void {
        if (this.network.connected) {
            const n = this.network.playerCount
            this.statusEl.textContent = `\u25CF connected \u00B7 ${n} other${n !== 1 ? 's' : ''}`
            this.statusEl.style.color = 'rgba(100, 220, 100, 0.6)'
        } else {
            this.statusEl.textContent = '\u25CB offline'
            this.statusEl.style.color = 'rgba(255, 255, 255, 0.4)'
        }
    }
}
