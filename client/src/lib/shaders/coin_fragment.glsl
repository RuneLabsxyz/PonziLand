uniform sampler2D map;
uniform vec3 outlineColor;
uniform vec3 pulseColor;
uniform float outlineWidth;
uniform float time;
uniform vec2 resolution;

varying vec2 vUv;
varying float vHover;
varying float vInstanceIndex; // Add this to receive instance index

void main() {
  vec4 texColor = texture2D(map, vUv);
  
  // Blend original texture with instance color
  vec3 finalColor = texColor.rgb;
  float alpha = texColor.a;

  if(vHover > 0.5) {
    // Create pulsing effect
    float pulse = sin(time * 4.0) * 0.4 + 0.6;

    // If current pixel is transparent, check if we should draw outline
    if(texColor.a < 0.1) {
      vec2 texelSize = outlineWidth / resolution;
      bool hasOpaqueNeighbor = false;

      // Check surrounding pixels to see if any are opaque
      for(int x = -1; x <= 1; x++) {
        for(int y = -1; y <= 1; y++) {
          if(x == 0 && y == 0)
            continue;

          vec2 offset = vec2(float(x), float(y)) * texelSize;
          vec4 neighbor = texture2D(map, vUv + offset);

          if(neighbor.a >= 0.1) {
            hasOpaqueNeighbor = true;
            break;
          }
        }
        if(hasOpaqueNeighbor)
          break;
      }

      if(hasOpaqueNeighbor) {
        // Draw outline in transparent areas adjacent to opaque pixels
        finalColor = mix(outlineColor, pulseColor, pulse);
        alpha = 1.0;
      } else {
        // Completely transparent
        discard;
      }
    } else {
      // Original sprite pixel - apply inner glow effect
      float glowAmount = 0.3 * pulse;
      vec3 glowColor = pulseColor;
      finalColor = mix(finalColor, glowColor, glowAmount);
      alpha = texColor.a;
    }
  } else {
    // Not hovering - only show original sprite
    if(texColor.a < 0.1) {
      discard;
    }
    finalColor = texColor.rgb;
    alpha = texColor.a;
  }

  gl_FragColor = vec4(finalColor, alpha);
}