varying vec2 vUv;
uniform float opacity;

void main() {
  vec2 center = vec2(0.5, 0.5);
  float dist = distance(vUv, center);
  
  // Create extremely soft circular gradient
  // Use higher power for more gradual falloff
  float falloff = 1.0 - dist * 2.0; // Linear distance to edge
  falloff = max(0.0, falloff); // Clamp negative values
  falloff = pow(falloff, 4.0); // Very gradual falloff
  
  // Bright yellow color with base alpha
  vec3 color = vec3(1.0, 0.92, 0.23); // ffeb3b in RGB
  float baseAlpha = 0.6;
  
  // Apply opacity and fade to 0 at edges
  gl_FragColor = vec4(color, falloff * baseAlpha * opacity);
}