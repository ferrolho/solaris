#include <common>
#include <logdepthbuf_pars_vertex>

varying vec2 vUv;

void main() {
    vUv = uv;
    // Get object center in view space
    vec4 mvPosition = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    // Extract scale from the model-view matrix columns
    float scaleX = length(modelViewMatrix[0].xyz);
    float scaleY = length(modelViewMatrix[1].xyz);
    // Billboard: offset from center in view space, applying object scale
    mvPosition.xy += position.xy * vec2(scaleX, scaleY);
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
}
