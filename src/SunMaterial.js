import * as THREE from 'three'

const vertexShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    #include <logdepthbuf_vertex>
}
`

const fragmentShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

// Simplex-style noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    i = mod289(i);
    vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
        value += amplitude * snoise(p * frequency);
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return value;
}

void main() {
    #include <logdepthbuf_fragment>

    vec3 pos = vPosition * 2.0;

    // Animated turbulence — slow convective motion
    float t = uTime * 0.08;
    float n1 = fbm(pos + vec3(t, 0.0, t * 0.7));
    float n2 = fbm(pos * 1.5 + vec3(0.0, t * 0.8, t));
    float turb = n1 * 0.6 + n2 * 0.4;

    // Granulation — fine convection cells covering the surface
    float granulation = fbm(pos * 10.0 + vec3(t * 0.3)) * 0.06;

    // Sunspots — sparse darker cooler regions with soft falloff
    float spotNoise = fbm(pos * 2.0 + vec3(t * 0.05));
    float spotNoise2 = fbm(pos * 3.5 + vec3(t * 0.08, 0.0, t * 0.03));

    // Color palette: ~5778K blackbody (near-white with subtle warm tint)
    vec3 warmWhite = vec3(1.0, 0.97, 0.92);
    vec3 brightWhite = vec3(1.0, 0.99, 0.96);
    vec3 coolRegion = vec3(0.95, 0.88, 0.75);

    float colorMix = turb * 0.5 + 0.5;
    vec3 color = mix(coolRegion, warmWhite, colorMix);
    color = mix(color, brightWhite, smoothstep(0.55, 0.8, colorMix) * 0.6);

    // Apply granulation — subtle brightness variation
    color *= 1.0 + granulation;

    // Sunspots — umbra (dark core) with penumbra (soft gradient surround)
    // Only activate where both noise layers are high (sparse spots)
    vec3 umbraColor = vec3(0.3, 0.18, 0.08);
    vec3 penumbraColor = vec3(0.65, 0.5, 0.3);
    float penumbra = smoothstep(0.3, 0.45, spotNoise) * smoothstep(0.25, 0.4, spotNoise2);
    float umbra = smoothstep(0.4, 0.5, spotNoise) * smoothstep(0.35, 0.45, spotNoise2);
    color = mix(color, penumbraColor, penumbra * 0.6);
    color = mix(color, umbraColor, umbra * 0.8);

    // Limb darkening — physically accurate: centre-to-limb variation
    // Real solar limb darkening follows I(theta) ~ 1 - u*(1 - cos(theta))
    // with u ~ 0.6 for visible wavelengths
    float cosTheta = dot(vNormal, vec3(0.0, 0.0, 1.0));
    float limbDarkening = 1.0 - 0.6 * (1.0 - cosTheta);

    // Limb reddening — edges shift warmer as we look through more atmosphere
    vec3 limbColor = vec3(1.0, 0.85, 0.6);
    color = mix(color * limbColor, color, smoothstep(0.0, 0.5, cosTheta));
    color *= limbDarkening;

    gl_FragColor = vec4(color, 1.0);
}
`

const coronaVertexShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vNormal;

void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    #include <logdepthbuf_vertex>
}
`

const coronaFragmentShader = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
varying vec3 vNormal;

void main() {
    #include <logdepthbuf_fragment>

    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
    float flicker = 0.92 + 0.08 * sin(uTime * 1.5);
    // Pearly white corona with subtle warm tint
    vec3 color = vec3(1.0, 0.95, 0.88) * intensity * flicker;
    gl_FragColor = vec4(color, intensity * 0.6);
}
`

export function createSunMaterial() {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
        },
        vertexShader,
        fragmentShader,
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
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    })
}
