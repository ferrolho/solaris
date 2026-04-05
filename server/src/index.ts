import { WebSocketServer, WebSocket } from 'ws'
import type { ClientMessage, ShipState } from './protocol.js'

const PORT = parseInt(process.env.PORT ?? '8080', 10)

interface Player {
    id: string
    username: string
    state: ShipState
    ws: WebSocket
}

const DEFAULT_STATE: ShipState = {
    px: 0, py: 0, pz: 0,
    qx: 0, qy: 0, qz: 0, qw: 1,
    vx: 0, vy: 0, vz: 0,
    thrust: 0,
    timestamp: 0,
}

const players = new Map<string, Player>()

const wss = new WebSocketServer({ port: PORT })
console.log(`[solaris-server] listening on ws://0.0.0.0:${PORT}`)

wss.on('connection', (ws, req) => {
    const addr = req.socket.remoteAddress ?? 'unknown'
    console.log(`[connect] ${addr}`)

    let playerId: string | null = null

    ws.on('message', (raw) => {
        let msg: ClientMessage
        try {
            msg = JSON.parse(raw.toString())
        } catch {
            return
        }

        switch (msg.type) {
            case 'join': {
                playerId = msg.id
                const player: Player = {
                    id: msg.id,
                    username: msg.username,
                    state: { ...DEFAULT_STATE },
                    ws,
                }
                players.set(msg.id, player)

                // Send current player list (excluding self)
                const roster: Record<string, { username: string; state: ShipState }> = {}
                for (const [id, p] of players) {
                    if (id !== msg.id) {
                        roster[id] = { username: p.username, state: p.state }
                    }
                }
                ws.send(JSON.stringify({ type: 'welcome', players: roster }))

                // Notify others
                broadcast({ type: 'player_joined', id: msg.id, username: msg.username, state: player.state }, msg.id)
                console.log(`[join] ${msg.username} (${msg.id.slice(0, 8)}…) — ${players.size} player(s)`)
                break
            }

            case 'state': {
                const player = players.get(msg.id)
                if (player) {
                    player.state = msg.state
                    broadcast({ type: 'state', id: msg.id, state: msg.state }, msg.id)
                }
                break
            }

            case 'rename': {
                const player = players.get(msg.id)
                if (player) {
                    player.username = msg.username
                    broadcast({ type: 'player_renamed', id: msg.id, username: msg.username }, msg.id)
                    console.log(`[rename] ${msg.id.slice(0, 8)}… → ${msg.username}`)
                }
                break
            }
        }
    })

    ws.on('close', () => {
        if (playerId) {
            const player = players.get(playerId)
            players.delete(playerId)
            broadcast({ type: 'player_left', id: playerId })
            console.log(`[leave] ${player?.username ?? playerId.slice(0, 8)} — ${players.size} player(s)`)
        }
    })

    ws.on('error', (err) => {
        console.error(`[error] ${addr}:`, err.message)
    })
})

function broadcast(msg: object, excludeId?: string): void {
    const raw = JSON.stringify(msg)
    for (const [id, player] of players) {
        if (id !== excludeId && player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(raw)
        }
    }
}
