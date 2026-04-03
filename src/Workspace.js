import * as THREE from 'three'

/** THREE Texture Loader */
export const textureLoader = new THREE.TextureLoader()

/** THREE Scene */
export const scene = new THREE.Scene()
scene.background = new THREE.Color('black')

/** Dictionary of bodies in the universe */
export const body_map = {}

export const clock = new THREE.Clock()
export let delta = clock.getDelta()

export function updateDelta() {
    delta = clock.getDelta()
}
