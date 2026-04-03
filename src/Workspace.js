import * as THREE from 'three'
import { Timer } from 'three'

/** THREE Texture Loader */
export const textureLoader = new THREE.TextureLoader()

/** THREE Scene */
export const scene = new THREE.Scene()
scene.background = new THREE.Color('black')

/** Dictionary of bodies in the universe */
export const body_map = {}

export const timer = new Timer()
export let delta = 0

export function updateDelta() {
    timer.update()
    delta = timer.getDelta()
}
