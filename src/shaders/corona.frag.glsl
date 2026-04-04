#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
varying vec2 vUv;

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

    vec2 centered = vUv * 2.0 - 1.0;
    float dist = length(centered);

    if (dist > 1.0) discard;

    float sunR = 1.0 / 3.0;
    // Anti-aliased sun edge (screen-space width)
    float edge = fwidth(dist) * 1.5;
    float diskMask = smoothstep(sunR + edge, sunR - edge, dist);

    // === Photosphere ===
    // Map 2D disk to sphere surface for 3D-looking noise
    float r = min(dist / sunR, 1.0);
    float cosTheta = sqrt(max(1.0 - r * r, 0.0));
    vec2 dir = (dist > 0.001) ? normalize(centered) : vec2(1.0, 0.0);
    // Rotate sphere normal from view space to world space so orbiting
    // the camera reveals different surface detail
    vec3 viewNormal = vec3(dir * r, cosTheta);
    mat3 invViewRot = transpose(mat3(viewMatrix));
    vec3 spherePos = (invViewRot * viewNormal) * 2.0;

    float t = uTime * 0.08;
    float n1 = fbm(spherePos + vec3(t, 0.0, t * 0.7));
    float n2 = fbm(spherePos * 1.5 + vec3(0.0, t * 0.8, t));
    float turb = n1 * 0.6 + n2 * 0.4;
    float granulation = fbm(spherePos * 10.0 + vec3(t * 0.3)) * 0.06;

    float spotNoise = fbm(spherePos * 2.0 + vec3(t * 0.05));
    float spotNoise2 = fbm(spherePos * 3.5 + vec3(t * 0.08, 0.0, t * 0.03));

    vec3 warmWhite = vec3(1.0, 0.97, 0.92);
    vec3 brightWhite = vec3(1.0, 0.99, 0.96);
    vec3 coolRegion = vec3(0.95, 0.88, 0.75);

    float colorMix = turb * 0.5 + 0.5;
    vec3 photoColor = mix(coolRegion, warmWhite, colorMix);
    photoColor = mix(photoColor, brightWhite, smoothstep(0.55, 0.8, colorMix) * 0.6);
    photoColor *= 1.0 + granulation;

    // Sunspots
    vec3 umbraColor = vec3(0.3, 0.18, 0.08);
    vec3 penumbraColor = vec3(0.65, 0.5, 0.3);
    float penumbra = smoothstep(0.3, 0.45, spotNoise) * smoothstep(0.25, 0.4, spotNoise2);
    float umbra = smoothstep(0.4, 0.5, spotNoise) * smoothstep(0.35, 0.45, spotNoise2);
    photoColor = mix(photoColor, penumbraColor, penumbra * 0.6);
    photoColor = mix(photoColor, umbraColor, umbra * 0.8);

    // Limb darkening — I(θ) ≈ 1 − u(1 − cosθ), u ≈ 0.6
    float limbDarkening = 1.0 - 0.6 * (1.0 - cosTheta);
    vec3 limbTint = vec3(1.0, 0.85, 0.6);
    photoColor = mix(photoColor * limbTint, photoColor, smoothstep(0.0, 0.5, cosTheta));
    photoColor *= limbDarkening;

    // Chromosphere — thin bright layer at the limb, bridges photosphere → corona
    float edgeGlow = pow(1.0 - cosTheta, 6.0) * 0.5;
    photoColor += vec3(1.0, 0.85, 0.55) * edgeGlow;

    // === Corona ===
    float coronaDist = max(dist - sunR, 0.0) / (1.0 - sunR);
    float glow = exp(-3.5 * coronaDist);
    float flicker = 0.95 + 0.05 * sin(uTime * 1.3);
    vec3 innerCorona = vec3(1.0, 0.85, 0.55);
    vec3 outerCorona = vec3(1.0, 0.6, 0.2);
    vec3 coronaColor = mix(innerCorona, outerCorona, coronaDist) * glow * flicker * 0.4;

    // === Composite (premultiplied alpha) ===
    // Inside sun disk: opaque photosphere (alpha = 1)
    // Outside: additive corona glow (alpha = 0)
    // Edge: smooth blend across a few pixels
    vec3 finalColor = photoColor * diskMask + coronaColor * (1.0 - diskMask);
    float finalAlpha = diskMask;

    gl_FragColor = vec4(finalColor, finalAlpha);
}
