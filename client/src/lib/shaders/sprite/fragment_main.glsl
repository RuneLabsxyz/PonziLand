vec4 sampledDiffuseColor = texture2D(map, spriteUv);
    vec3 finalColor = sampledDiffuseColor.rgb;
    float finalAlpha = sampledDiffuseColor.a;

    if(true) {
        // Create pulsing effect
        float pulse = sin(time * 4.0) * 0.4 + 0.6;

        // If current pixel is transparent, check if we should draw outline
        if(sampledDiffuseColor.a < 0.1) {
            vec2 texelSize = outlineWidth / resolution;
            bool hasOpaqueNeighbor = false;

            // Check surrounding pixels to see if any are opaque
            for(int x = -1; x <= 1; x++) {
                for(int y = -1; y <= 1; y++) {
                    if(x == 0 && y == 0)
                        continue;

                    vec2 offset = vec2(float(x), float(y)) * texelSize;
                    vec4 neighbor = texture2D(map, spriteUv + offset);

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
                finalAlpha = 1.0;
            } else {
                // Completely transparent
                discard;
            }
        } else {
            // Original sprite pixel - apply inner glow effect
            float glowAmount = 0.3 * pulse;
            vec3 glowColor = pulseColor;
            finalColor = mix(finalColor, glowColor, glowAmount);
            finalAlpha = sampledDiffuseColor.a;
        }
    } else {
        // Not hovering - only show original sprite
        if(sampledDiffuseColor.a < 0.1) {
            discard;
        }
        finalColor = sampledDiffuseColor.rgb;
        finalAlpha = sampledDiffuseColor.a;
    }

    // Apply tint if needed
    if(tint.w == 1.0) {
        vec3 hue_term = 1.0 - min(abs(vec3(tint.x) - vec3(0,2.0,1.0)), 1.0);
        hue_term.x = 1.0 - dot(hue_term.yz, vec2(1));
        vec3 res = vec3(dot(finalColor, hue_term.xyz), dot(finalColor, hue_term.zxy), dot(finalColor, hue_term.yzx));
        res = mix(vec3(dot(res, vec3(0.2, 0.5, 0.3))), res, tint.y);
        res = res * tint.z;
        finalColor = res;
    }

    baseColor = finalColor; // Store for lighting
    baseAlpha = finalAlpha; // Store for final output