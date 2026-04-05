/** Ship state transmitted over the wire */
export interface ShipState {
    px: number; py: number; pz: number             // position (AU)
    qx: number; qy: number; qz: number; qw: number // orientation (quaternion)
    vx: number; vy: number; vz: number             // velocity (AU/s)
    thrust: number                                  // current thrust (for future visual FX)
    timestamp: number                               // client time (ms)
}

/** Client -> Server */
export type ClientMessage =
    | { type: 'join'; id: string; username: string }
    | { type: 'state'; id: string; state: ShipState }
    | { type: 'rename'; id: string; username: string }
    | { type: 'leave'; id: string }

/** Server -> Client */
export type ServerMessage =
    | { type: 'welcome'; players: Record<string, { username: string; state: ShipState }> }
    | { type: 'player_joined'; id: string; username: string; state: ShipState }
    | { type: 'player_left'; id: string }
    | { type: 'player_renamed'; id: string; username: string }
    | { type: 'state'; id: string; state: ShipState }
