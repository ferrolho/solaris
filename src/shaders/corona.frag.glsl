#include <common>
#include <logdepthbuf_pars_fragment>

uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
    #include <logdepthbuf_fragment>

    vec3 viewDir = normalize(vViewPosition);
    float intensity = pow(0.65 - dot(vNormal, viewDir), 3.0);
    float flicker = 0.92 + 0.08 * sin(uTime * 1.5);
    // Pearly white corona with subtle warm tint
    vec3 color = vec3(1.0, 0.95, 0.88) * intensity * flicker;
    gl_FragColor = vec4(color, intensity * 0.6);
}
