#include <common>
#include <logdepthbuf_pars_vertex>

varying vec3 vNormal;

void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    #include <logdepthbuf_vertex>
}
