/* THREE */

import * as THREE from 'three'

/** THREE Texture Loader */
export const textureLoader = new THREE.TextureLoader()

/** THREE Scene */
export const scene = new THREE.Scene()
scene.background = new THREE.Color('white');
// scene.fog = new THREE.Fog(0x000, 0, 100);

/* Dictionary of bodies in the universe */
export let body_map = {}

export const clock = new THREE.Clock()
export let delta = clock.getDelta()
