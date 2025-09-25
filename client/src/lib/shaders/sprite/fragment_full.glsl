uniform sampler2D animationData;
uniform int animationDataSize;
uniform sampler2D spritesheetData;
uniform float startTime;
uniform float time;
uniform float flipX;
uniform float flipY;
uniform vec2 dataSize;
uniform vec4 tint;
uniform vec3 outlineColor;
uniform vec3 pulseColor;
uniform vec3 outlineColors[32]; // Support up to 32 different outline colors
uniform vec3 pulseColors[32];   // Support up to 32 different pulse colors
uniform int numOutlinedInstances;
uniform float outlineWidth;
uniform vec2 resolution;

// Owned land uniforms
uniform float ownedLandIndices[32];
uniform int numOwnedLands;
uniform float darkenFactor;
uniform bool darkenOnlyWhenUnzoomed;
uniform bool isUnzoomed;

varying float vHover;
varying vec3 vOutlineColor;
varying vec3 vPulseColor;
varying float vIsOwned;
varying float vIsAuction;
vec3 baseColor; // To store outline/glow color
float baseAlpha; // To store outline/glow alpha

flat varying int vId;

vec4 readData(float col, float row) {
    float wStep = 1.0 / dataSize.x;
    float wHalfStep = wStep * 0.5;
    float hStep = 1.0 / dataSize.y;
    float hHalfStep = hStep * 0.5;
    return texture2D(spritesheetData, vec2(col * wStep + wHalfStep, row * hStep + hHalfStep));
}

vec2 zoomUV(vec2 uv, vec2 zoomCenter, float zoomFactor) {
    vec2 shiftedUV = uv - zoomCenter;
    shiftedUV *= zoomFactor;
    shiftedUV += zoomCenter;
    return shiftedUV;
}

uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
    varying vec3 vNormal;
#endif
#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate(a) clamp(a, 0.0, 1.0)
#endif
#define whiteComplement(a) (1.0 - saturate(a))
float pow2(const in float x) { return x*x; }
vec3 pow2(const in vec3 x) { return x*x; }
float pow3(const in float x) { return x*x*x; }
float pow4(const in float x) { float x2 = x*x; return x2*x2; }
float max3(const in vec3 v) { return max(max(v.x, v.y), v.z); }
float average(const in vec3 v) { return dot(v, vec3(0.3333333)); }
highp float rand(const in vec2 uv) {
    const highp float a = 12.9898, b = 78.233, c = 43758.5453;
    highp float dt = dot(uv.xy, vec2(a,b)), sn = mod(dt, PI);
    return fract(sin(sn) * c);
}
#ifdef HIGH_PRECISION
    float precisionSafeLength(vec3 v) { return length(v); }
#else
    float precisionSafeLength(vec3 v) {
        float maxComponent = max3(abs(v));
        return length(v / maxComponent) * maxComponent;
    }
#endif
struct IncidentLight {
    vec3 color;
    vec3 direction;
    bool visible;
};
struct ReflectedLight {
    vec3 directDiffuse;
    vec3 directSpecular;
    vec3 indirectDiffuse;
    vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
    varying vec3 vPosition;
#endif
vec3 transformDirection(in vec3 dir, in mat4 matrix) {
    return normalize((matrix * vec4(dir, 0.0)).xyz);
}
vec3 inverseTransformDirection(in vec3 dir, in mat4 matrix) {
    return normalize((vec4(dir, 0.0) * matrix).xyz);
}
mat3 transposeMat3(const in mat3 m) {
    mat3 tmp;
    tmp[0] = vec3(m[0].x, m[1].x, m[2].x);
    tmp[1] = vec3(m[0].y, m[1].y, m[2].y);
    tmp[2] = vec3(m[0].z, m[1].z, m[2].z);
    return tmp;
}
bool isPerspectiveMatrix(mat4 m) {
    return m[2][3] == -1.0;
}
vec2 equirectUv(in vec3 dir) {
    float u = atan(dir.z, dir.x) * RECIPROCAL_PI2 + 0.5;
    float v = asin(clamp(dir.y, -1.0, 1.0)) * RECIPROCAL_PI + 0.5;
    return vec2(u, v);
}
vec3 BRDF_Lambert(const in vec3 diffuseColor) {
    return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick(const in vec3 f0, const in float f90, const in float dotVH) {
    float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
    return f0 * (1.0 - fresnel) + (f90 * fresnel);
}
float F_Schlick(const in float f0, const in float f90, const in float dotVH) {
    float fresnel = exp2((-5.55473 * dotVH - 6.98316) * dotVH);
    return f0 * (1.0 - fresnel) + (f90 * fresnel);
}
#ifdef DITHERING
    vec3 dithering(vec3 color) {
        float grid_position = rand(gl_FragCoord.xy);
        vec3 dither_shift_RGB = vec3(0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0);
        dither_shift_RGB = mix(2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position);
        return color + dither_shift_RGB;
    }
#endif
#if defined(USE_COLOR_ALPHA)
    varying vec4 vColor;
#elif defined(USE_COLOR)
    varying vec3 vColor;
#endif
#if defined(USE_UV) || defined(USE_ANISOTROPY)
    varying vec2 vUv;
#endif
#ifdef USE_MAP
    varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
    varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
    varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
    varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
    varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
    varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
    varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
    varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
    varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
    varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
    varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
    varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
    varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
    varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
    varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
    varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
    varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
    varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
    varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
    varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
    uniform mat3 transmissionMapTransform;
    varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
    uniform mat3 thicknessMapTransform;
    varying vec2 vThicknessMapUv;
#endif
#ifdef USE_MAP
    uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
    uniform sampler2D alphaMap;
#endif
#ifdef USE_ALPHATEST
    uniform float alphaTest;
#endif
#ifdef USE_ALPHAHASH
    const float ALPHA_HASH_SCALE = 0.05;
    float hash2D(vec2 value) {
        return fract(1.0e4 * sin(17.0 * value.x + 0.1 * value.y) * (0.1 + abs(sin(13.0 * value.y + value.x))));
    }
    float hash3D(vec3 value) {
        return hash2D(vec2(hash2D(value.xy), value.z));
    }
    float getAlphaHashThreshold(vec3 position) {
        float maxDeriv = max(
            length(dFdx(position.xyz)),
            length(dFdy(position.xyz))
        );
        float pixScale = 1.0 / (ALPHA_HASH_SCALE * maxDeriv);
        vec2 pixScales = vec2(
            exp2(floor(log2(pixScale))),
            exp2(ceil(log2(pixScale)))
        );
        vec2 alpha = vec2(
            hash3D(floor(pixScales.x * position.xyz)),
            hash3D(floor(pixScales.y * position.xyz))
        );
        float lerpFactor = fract(log2(pixScale));
        float x = (1.0 - lerpFactor) * alpha.x + lerpFactor * alpha.y;
        float a = min(lerpFactor, 1.0 - lerpFactor);
        vec3 cases = vec3(
            x * x / (2.0 * a * (1.0 - a)),
            (x - 0.5 * a) / (1.0 - a),
            1.0 - ((1.0 - x) * (1.0 - x) / (2.0 * a * (1.0 - a)))
        );
        float threshold = (x < (1.0 - a))
            ? ((x < a) ? cases.x : cases.y)
            : cases.z;
        return clamp(threshold, 1.0e-6, 1.0);
    }
#endif
#ifdef USE_AOMAP
    uniform sampler2D aoMap;
    uniform float aoMapIntensity;
#endif
#ifdef USE_LIGHTMAP
    uniform sampler2D lightMap;
    uniform float lightMapIntensity;
#endif
#ifdef USE_ENVMAP
    uniform float envMapIntensity;
    uniform float flipEnvMap;
    uniform mat3 envMapRotation;
    #ifdef ENVMAP_TYPE_CUBE
        uniform samplerCube envMap;
    #else
        uniform sampler2D envMap;
    #endif
#endif
#ifdef USE_ENVMAP
    uniform float reflectivity;
    #if defined(USE_BUMPMAP) || defined(USE_NORMALMAP) || defined(PHONG) || defined(LAMBERT)
        #define ENV_WORLDPOS
    #endif
    #ifdef ENV_WORLDPOS
        varying vec3 vWorldPosition;
        uniform float refractionRatio;
    #else
        varying vec3 vReflect;
    #endif
#endif
#ifdef USE_FOG
    uniform vec3 fogColor;
    varying float vFogDepth;
    #ifdef FOG_EXP2
        uniform float fogDensity;
    #else
        uniform float fogNear;
        uniform float fogFar;
    #endif
#endif
#ifdef USE_SPECULARMAP
    uniform sampler2D specularMap;
#endif
#if defined(USE_LOGDEPTHBUF)
    uniform float logDepthBufFC;
    varying float vFragDepth;
    varying float vIsPerspective;
#endif
#if NUM_CLIPPING_PLANES > 0
    varying vec3 vClipPosition;
    uniform vec4 clippingPlanes[NUM_CLIPPING_PLANES];
#endif

void main() {
    float y = float(vId / animationDataSize) / float(animationDataSize);
    float x = mod(float(vId), float(animationDataSize)) / float(animationDataSize);

    float spritesheetFrameId = texture2D(animationData, vec2(x, y)).r;

    vec4 frameMeta = readData(spritesheetFrameId, 0.0);
    vec2 fSize = frameMeta.zw;
    vec2 fOffset = vec2(frameMeta.xy);

    vec2 transformedPlaneUv = vUv + vec2(0.0, 0.0);

    if(flipX > 0.0) {
        transformedPlaneUv.x = 1.0 - transformedPlaneUv.x;
    }
    if(flipY > 0.0) {
        transformedPlaneUv.y = 1.0 - transformedPlaneUv.y;
    }

    vec2 spriteUv = fSize * transformedPlaneUv + fOffset;

    #ifdef TRI_GEOMETRY
        if(vUv.y > 0.5 || vUv.x < 0.25 || vUv.x > 0.75) {
            discard;
        }
        vec2 zoomCenter = vec2(fSize.x * 0.5, 0.0) + fOffset;
        float zoomFactor = 2.0;
        vec2 shiftedUV = spriteUv - zoomCenter;
        shiftedUV *= zoomFactor;
        shiftedUV += zoomCenter;
        spriteUv = shiftedUV;
    #endif

    #ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D(map, spriteUv);
        vec3 finalColor = sampledDiffuseColor.rgb;
        float finalAlpha = sampledDiffuseColor.a;

        if(vIsOwned > 0.5) {
            // Apply stripe pattern darkening based on darkenOnlyWhenUnzoomed setting
            if(!darkenOnlyWhenUnzoomed || isUnzoomed) {
                // Create diagonal stripe pattern
                float interval = 20.0;
                float stripe = step(mod(gl_FragCoord.y - gl_FragCoord.x, interval) / (interval - 1.0), 0.5);
                stripe = 0.4 + stripe * 0.4; // Maps 0->0.4 and 1->0.8 (darkening)
                finalColor = finalColor * stripe;
            }
        }

        if(vIsAuction > 0.5) {
            // Apply stripe pattern whitening for auction lands
            if(!darkenOnlyWhenUnzoomed || isUnzoomed) {
                // Create diagonal stripe pattern
                float interval = 20.0;
                float stripe = step(mod(gl_FragCoord.y - gl_FragCoord.x, interval) / (interval - 1.0), 0.5);
                stripe = 1.2 + stripe * 0.2; // Maps 0->1.2 and 1->1.4 (whitening)
                finalColor = finalColor * stripe;
            }
        }

        if(vHover > 0.5) {
            // If current pixel is transparent, check if we should draw outline
            if(sampledDiffuseColor.a < 0.1) {
                vec2 texelSize = outlineWidth / resolution;
                bool hasOpaqueNeighbor = false;

                // Calculate sprite bounds for clamping
                vec2 spriteMin = fOffset;
                vec2 spriteMax = fOffset + fSize;

                // Check surrounding pixels to see if any are opaque
                for(int x = -1; x <= 1; x++) {
                    for(int y = -1; y <= 1; y++) {
                        if(x == 0 && y == 0)
                            continue;

                        vec2 offset = vec2(float(x), float(y)) * texelSize;
                        vec2 sampleUv = spriteUv + offset;
                        
                        // Only check neighbors that are within the current sprite bounds
                        if(sampleUv.x >= spriteMin.x && sampleUv.x <= spriteMax.x &&
                           sampleUv.y >= spriteMin.y && sampleUv.y <= spriteMax.y) {
                            vec4 neighbor = texture2D(map, sampleUv);

                            if(neighbor.a >= 0.1) {
                                hasOpaqueNeighbor = true;
                                break;
                            }
                        }
                    }
                    if(hasOpaqueNeighbor)
                        break;
                }

                if(hasOpaqueNeighbor) {
                    // Draw outline in transparent areas adjacent to opaque pixels
                    finalColor = vOutlineColor;
                    finalAlpha = 1.0;
                } else {
                    // Completely transparent
                    discard;
                }
            }
        }

        // Generate RGB color based on instance ID using modulo 3
        if(false) {
            int colorChannel = int(mod(float(vId), 3.0));
            vec3 instanceColor = vec3(0.0);
            if(colorChannel == 0) {
                instanceColor = vec3(1.0, 0.2, 0.2); // Red-ish
            } else if(colorChannel == 1) {
                instanceColor = vec3(0.2, 1.0, 0.2); // Green-ish
            } else {
                instanceColor = vec3(0.2, 0.2, 1.0); // Blue-ish
            }
            
            // Mix the instance color with the original sprite color
            finalColor = mix(finalColor, instanceColor, 0.3);
        }

        // Apply tint if needed
        if(tint.w == 1.0) {
            vec3 hue_term = 1.0 - min(abs(vec3(tint.x) - vec3(0.0, 2.0, 1.0)), 1.0);
            hue_term.x = 1.0 - dot(hue_term.yz, vec2(1.0));
            vec3 res = vec3(dot(finalColor, hue_term.xyz), dot(finalColor, hue_term.zxy), dot(finalColor, hue_term.yzx));
            res = mix(vec3(dot(res, vec3(0.2, 0.5, 0.3))), res, tint.y);
            res = res * tint.z;
            finalColor = res;
        }

        baseColor = finalColor; // Store for lighting
        baseAlpha = finalAlpha; // Store for final output

        #ifdef DECODE_VIDEO_TEXTURE
            sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
        #endif
    #endif

    vec4 diffuseColor = vec4(diffuse, opacity);

    #if NUM_CLIPPING_PLANES > 0
        vec4 plane;
        #ifdef ALPHA_TO_COVERAGE
            float distanceToPlane, distanceGradient;
            float clipOpacity = 1.0;
            #pragma unroll_loop_start
            for(int i = 0; i < UNION_CLIPPING_PLANES; i++) {
                plane = clippingPlanes[i];
                distanceToPlane = -dot(vClipPosition, plane.xyz) + plane.w;
                distanceGradient = fwidth(distanceToPlane) / 2.0;
                clipOpacity *= smoothstep(-distanceGradient, distanceGradient, distanceToPlane);
                if(clipOpacity == 0.0) discard;
            }
            #pragma unroll_loop_end
            #if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
                float unionClipOpacity = 1.0;
                #pragma unroll_loop_start
                for(int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i++) {
                    plane = clippingPlanes[i];
                    distanceToPlane = -dot(vClipPosition, plane.xyz) + plane.w;
                    distanceGradient = fwidth(distanceToPlane) / 2.0;
                    unionClipOpacity *= 1.0 - smoothstep(-distanceGradient, distanceGradient, distanceToPlane);
                }
                #pragma unroll_loop_end
                clipOpacity *= 1.0 - unionClipOpacity;
            #endif
            diffuseColor.a *= clipOpacity;
            if(diffuseColor.a == 0.0) discard;
        #else
            #pragma unroll_loop_start
            for(int i = 0; i < UNION_CLIPPING_PLANES; i++) {
                plane = clippingPlanes[i];
                if(dot(vClipPosition, plane.xyz) > plane.w) discard;
            }
            #pragma unroll_loop_end
            #if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
                bool clipped = true;
                #pragma unroll_loop_start
                for(int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i++) {
                    plane = clippingPlanes[i];
                    clipped = (dot(vClipPosition, plane.xyz) > plane.w) && clipped;
                }
                #pragma unroll_loop_end
                if(clipped) discard;
            #endif
        #endif
    #endif

    #if defined(USE_LOGDEPTHBUF)
        gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2(vFragDepth) * logDepthBufFC * 0.5;
    #endif

    #if defined(USE_COLOR_ALPHA)
        diffuseColor *= vColor;
    #elif defined(USE_COLOR)
        diffuseColor.rgb *= vColor;
    #endif

    #ifdef USE_ALPHAMAP
        diffuseColor.a *= texture2D(alphaMap, spriteUv).g;
    #endif

    #ifdef USE_ALPHATEST
        #ifdef ALPHA_TO_COVERAGE
            diffuseColor.a = smoothstep(alphaTest, alphaTest + fwidth(diffuseColor.a), diffuseColor.a);
            if(diffuseColor.a == 0.0) discard;
        #else
            if(diffuseColor.a < alphaTest) discard;
        #endif
    #endif

    #ifdef USE_ALPHAHASH
        if(diffuseColor.a < getAlphaHashThreshold(vPosition)) discard;
    #endif

    float specularStrength;
    #ifdef USE_SPECULARMAP
        vec4 texelSpecular = texture2D(specularMap, vSpecularMapUv);
        specularStrength = texelSpecular.r;
    #else
        specularStrength = 1.0;
    #endif

    ReflectedLight reflectedLight = ReflectedLight(vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0));
    #ifdef USE_LIGHTMAP
        vec4 lightMapTexel = texture2D(lightMap, vLightMapUv);
        reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
    #else
        reflectedLight.indirectDiffuse += vec3(1.0);
    #endif

    #ifdef USE_AOMAP
        float ambientOcclusion = (texture2D(aoMap, vAoMapUv).r - 1.0) * aoMapIntensity + 1.0;
        reflectedLight.indirectDiffuse *= ambientOcclusion;
        #if defined(USE_CLEARCOAT)
            clearcoatSpecularIndirect *= ambientOcclusion;
        #endif
        #if defined(USE_SHEEN)
            sheenSpecularIndirect *= ambientOcclusion;
        #endif
        #if defined(USE_ENVMAP) && defined(STANDARD)
            float dotNV = saturate(dot(geometryNormal, geometryViewDir));
            reflectedLight.indirectSpecular *= computeSpecularOcclusion(dotNV, ambientOcclusion, material.roughness);
        #endif
    #endif

    reflectedLight.indirectDiffuse *= baseColor;
    vec3 outgoingLight = reflectedLight.indirectDiffuse;

    #ifdef USE_ENVMAP
        #ifdef ENV_WORLDPOS
            vec3 cameraToFrag;
            if(isOrthographic) {
                cameraToFrag = normalize(vec3(-viewMatrix[0][2], -viewMatrix[1][2], -viewMatrix[2][2]));
            } else {
                cameraToFrag = normalize(vWorldPosition - cameraPosition);
            }
            vec3 worldNormal = inverseTransformDirection(normal, viewMatrix);
            #ifdef ENVMAP_MODE_REFLECTION
                vec3 reflectVec = reflect(cameraToFrag, worldNormal);
            #else
                vec3 reflectVec = refract(cameraToFrag, worldNormal, refractionRatio);
            #endif
        #else
            vec3 reflectVec = vReflect;
        #endif
        #ifdef ENVMAP_TYPE_CUBE
            vec4 envColor = textureCube(envMap, envMapRotation * vec3(flipEnvMap * reflectVec.x, reflectVec.yz));
        #else
            vec4 envColor = vec4(0.0);
        #endif
        #ifdef ENVMAP_BLENDING_MULTIPLY
            outgoingLight = mix(outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity);
        #elif defined(ENVMAP_BLENDING_MIX)
            outgoingLight = mix(outgoingLight, envColor.xyz, specularStrength * reflectivity);
        #elif defined(ENVMAP_BLENDING_ADD)
            outgoingLight += envColor.xyz * specularStrength * reflectivity;
        #endif
    #endif

    #ifdef OPAQUE
        diffuseColor.a = 1.0;
    #endif
    #ifdef USE_TRANSMISSION
        diffuseColor.a *= material.transmissionAlpha;
    #endif

    gl_FragColor = vec4(outgoingLight, baseAlpha);

    #if defined(TONE_MAPPING)
        gl_FragColor.rgb = toneMapping(gl_FragColor.rgb);
    #endif

    gl_FragColor = linearToOutputTexel(gl_FragColor);

    #ifdef USE_FOG
        #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
        #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        #endif
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor);
    #endif

    #ifdef PREMULTIPLIED_ALPHA
        gl_FragColor.rgb *= gl_FragColor.a;
    #endif

    #ifdef DITHERING
        gl_FragColor.rgb = dithering(gl_FragColor.rgb);
    #endif
}