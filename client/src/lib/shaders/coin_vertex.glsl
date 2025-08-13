uniform float hoverState;
uniform float hoveredInstanceIndex;

varying vec2 vUv;
varying float vHover;
varying float vInstanceIndex; // New varying to pass instance index

void main() {
  vUv = uv;
  // Pass the instance index to the fragment shader
  vInstanceIndex = float(gl_InstanceID); // Use gl_InstanceID for instanced rendering
  // Only apply hover effect if this instance is the one being hovered
  vHover = (hoverState > 0.5 && vInstanceIndex == hoveredInstanceIndex) ? 1.0 : 0.0;

  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}