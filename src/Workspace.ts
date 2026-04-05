import * as THREE from 'three'
import { Timer } from 'three'
import type Body from './Body'

/** THREE Texture Loader — base path matches Vite's configured base URL */
export const textureLoader = new THREE.TextureLoader()
textureLoader.setPath(import.meta.env.BASE_URL)

/** THREE Scene */
export const scene = new THREE.Scene()
scene.background = new THREE.Color('black')

/** Dictionary of bodies in the universe */
export const body_map: Record<string, Body> = {}

export const timer = new Timer()
export let delta = 0

/** Simulation time scale: 1 wall-second = this many sim-seconds.
 *  1 = real-time (Earth rotates once per 24h). */
export const timeScale = 1

export function updateDelta(): void {
    timer.update()
    delta = timer.getDelta()
}
