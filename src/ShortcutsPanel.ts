const SHORTCUTS: [string, string][] = [
    ['Tab', 'Cycle camera mode'],
    ['W / S', 'Thrust forward / backward'],
    ['A / D', 'Yaw left / right'],
    ['\u2191 / \u2193', 'Pitch up / down'],
    ['Q / E', 'Roll left / right'],
    ['Shift', 'Speed boost (10\u00D7)'],
    ['0\u20139', 'Teleport to body (observer)'],
    ['?', 'Toggle this panel'],
]

/**
 * Keyboard shortcuts overlay, toggled with '?'.
 */
export class ShortcutsPanel {
    private el: HTMLDivElement
    private visible = false

    constructor() {
        this.el = document.createElement('div')
        Object.assign(this.el.style, {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '300px',
            padding: '16px 20px',
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            pointerEvents: 'none',
            zIndex: '300',
            fontFamily: "'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            color: 'rgba(255, 255, 255, 0.85)',
            display: 'none',
            overflow: 'hidden',
        })

        // Accent line
        const scanline = document.createElement('div')
        Object.assign(scanline.style, {
            position: 'absolute',
            top: '0', left: '0', right: '0',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(120, 180, 255, 0.4), transparent)',
        })
        this.el.appendChild(scanline)

        // Title
        const title = document.createElement('div')
        Object.assign(title.style, {
            fontSize: '9px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: 'rgba(120, 180, 255, 0.5)',
            marginBottom: '12px',
        })
        title.textContent = 'keyboard shortcuts'
        this.el.appendChild(title)

        // Rows
        for (const [key, desc] of SHORTCUTS) {
            const row = document.createElement('div')
            Object.assign(row.style, {
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
            })

            const keyEl = document.createElement('span')
            Object.assign(keyEl.style, {
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.95)',
                minWidth: '80px',
            })
            keyEl.textContent = key

            const descEl = document.createElement('span')
            Object.assign(descEl.style, {
                fontSize: '11px',
                color: 'rgba(255, 255, 255, 0.55)',
                textAlign: 'right',
            })
            descEl.textContent = desc

            row.appendChild(keyEl)
            row.appendChild(descEl)
            this.el.appendChild(row)
        }

        document.body.appendChild(this.el)

        window.addEventListener('keydown', (e) => {
            if (e.key === '?') {
                this.toggle()
            }
        })
    }

    private toggle(): void {
        this.visible = !this.visible
        this.el.style.display = this.visible ? 'block' : 'none'
    }
}
