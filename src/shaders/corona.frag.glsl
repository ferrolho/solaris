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
