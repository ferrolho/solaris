import * as THREE from 'three'
import type { Ship } from './Ship'
import type { ClientMessage, ServerMessage } from './NetworkProtocol'
import { RemotePlayer } from './RemotePlayer'

const SEND_INTERVAL = 50 // ms (20 Hz)
const RECONNECT_BASE = 1000
const RECONNECT_MAX = 10000

export class NetworkClient {
    private ws: WebSocket | null = null
    private sendTimer: ReturnType<typeof setInterval> | null = null
    private ship: Ship | null = null
    private scene: THREE.Scene
    private url: string
    private localId: string
    private localUsername: string
    private remotePlayers = new Map<string, RemotePlayer>()
    private reconnectDelay = RECONNECT_BASE
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    private disposed = false

    constructor(url: string, id: string, username: string, scene: THREE.Scene) {
        this.url = url
        this.localId = id
        this.localUsername = username
        this.scene = scene
    }

    connect(): void {
        if (this.disposed) return
        try {
            this.ws = new WebSocket(this.url)
        } catch {
            this.scheduleReconnect()
            return
        }

        this.ws.onopen = () => {
            this.reconnectDelay = RECONNECT_BASE
            this.send({ type: 'join', id: this.localId, username: this.localUsername })
        }

        this.ws.onmessage = (ev) => {
            let msg: ServerMessage
            try {
                msg = JSON.parse(ev.data)
            } catch {
                return
            }
            this.handleMessage(msg)
        }

        this.ws.onclose = () => {
            this.ws = null
            this.scheduleReconnect()
        }

        this.ws.onerror = () => {
            // onclose will fire after this
        }
    }

    startSendLoop(ship: Ship): void {
        this.ship = ship
        if (this.sendTimer) return
        this.sendTimer = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN && this.ship) {
                this.send({ type: 'state', id: this.localId, state: this.ship.getState() })
            }
        }, SEND_INTERVAL)
    }

    stopSendLoop(): void {
        if (this.sendTimer) {
            clearInterval(this.sendTimer)
            this.sendTimer = null
        }
    }

    /** Call each frame to interpolate remote player positions. */
    update(delta: number): void {
        for (const rp of this.remotePlayers.values()) {
            rp.update(delta)
        }
    }

    /** Send a rename message to the server. */
    rename(username: string): void {
        this.localUsername = username
        this.send({ type: 'rename', id: this.localId, username })
    }

    get connected(): boolean {
        return this.ws?.readyState === WebSocket.OPEN
    }

    get playerCount(): number {
        return this.remotePlayers.size
    }

    dispose(): void {
        this.disposed = true
        this.stopSendLoop()
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
        for (const rp of this.remotePlayers.values()) {
            rp.dispose(this.scene)
        }
        this.remotePlayers.clear()
        this.ws?.close()
    }

    private send(msg: ClientMessage): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(msg))
        }
    }

    private handleMessage(msg: ServerMessage): void {
        switch (msg.type) {
            case 'welcome':
                for (const [id, info] of Object.entries(msg.players)) {
                    const rp = new RemotePlayer(id, info.username, this.scene)
                    rp.pushState(info.state)
                    this.remotePlayers.set(id, rp)
                }
                break

            case 'player_joined': {
                if (msg.id === this.localId) break
                if (!this.remotePlayers.has(msg.id)) {
                    const rp = new RemotePlayer(msg.id, msg.username, this.scene)
                    rp.pushState(msg.state)
                    this.remotePlayers.set(msg.id, rp)
                }
                break
            }

            case 'player_left': {
                const rp = this.remotePlayers.get(msg.id)
                if (rp) {
                    rp.dispose(this.scene)
                    this.remotePlayers.delete(msg.id)
                }
                break
            }

            case 'player_renamed': {
                const rp = this.remotePlayers.get(msg.id)
                if (rp) rp.setUsername(msg.username)
                break
            }

            case 'state': {
                const rp = this.remotePlayers.get(msg.id)
                if (rp) rp.pushState(msg.state)
                break
            }
        }
    }

    private scheduleReconnect(): void {
        if (this.disposed) return
        if (this.reconnectTimer) return
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            this.connect()
        }, this.reconnectDelay)
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, RECONNECT_MAX)
    }
}
