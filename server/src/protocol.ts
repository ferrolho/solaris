/** Ship state transmitted over the wire */
export interface ShipState {
    px: number; py: number; pz: number
    qx: number; qy: number; qz: number; qw: number
    vx: number; vy: number; vz: number
    thrust: number
    timestamp: number
}

export type ClientMessage =
    | { type: 'join'; id: string; username: string }
    | { type: 'state'; id: string; state: ShipState }
    | { type: 'rename'; id: string; username: string }
    | { type: 'leave'; id: string }

export type ServerMessage =
    | { type: 'welcome'; players: Record<string, { username: string; state: ShipState }> }
    | { type: 'player_joined'; id: string; username: string; state: ShipState }
    | { type: 'player_left'; id: string }
    | { type: 'player_renamed'; id: string; username: string }
    | { type: 'state'; id: string; state: ShipState }
