import * as THREE from 'three'

import sunVertexShader from './shaders/sun.vert.glsl?raw'
import sunFragmentShader from './shaders/sun.frag.glsl?raw'
import coronaVertexShader from './shaders/corona.vert.glsl?raw'
import coronaFragmentShader from './shaders/corona.frag.glsl?raw'

export function createSunMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
        },
        vertexShader: sunVertexShader,
        fragmentShader: sunFragmentShader,
    })
}

export function createCoronaMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
        },
        vertexShader: coronaVertexShader,
        fragmentShader: coronaFragmentShader,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
        depthWrite: false,
    })
}
