// src/lib/materials/OutlineSpriteMaterial.ts
import * as THREE from 'three';

interface InstancedSpriteSpritesheet {
  texture: THREE.Texture;
  frameInfoTexture: THREE.DataTexture;
  uvTransform: THREE.Vector2;
  uvOffset: THREE.Vector2;
  uvScale: THREE.Vector2;
}

// Ensure the class name is capitalized as is standard for Three.js materials
// and that it is properly exported.
export class OutlineSpriteMaterial extends THREE.ShaderMaterial {
  constructor(
    spritesheet: InstancedSpriteSpritesheet,
    outlineWidth: number,
    outlineColor: THREE.ColorRepresentation,
  ) {
    super({
      uniforms: {
        map: { value: spritesheet.texture },
        color: { value: new THREE.Color(1, 1, 1) },
        opacity: { value: 1.0 },
        billboarding: { value: true },
        frameInfoTexture: { value: spritesheet.frameInfoTexture },
        frameInfoTextureWidth: {
          value: spritesheet.frameInfoTexture.image.width,
        },
        frameInfoTextureHeight: {
          value: spritesheet.frameInfoTexture.image.height,
        },
        uvTransform: {
          value: new THREE.Vector2(
            spritesheet.uvTransform.x,
            spritesheet.uvTransform.y,
          ),
        },
        uvOffset: {
          value: new THREE.Vector2(
            spritesheet.uvOffset.x,
            spritesheet.uvOffset.y,
          ),
        },
        uvScale: {
          value: new THREE.Vector2(
            spritesheet.uvScale.x,
            spritesheet.uvScale.y,
          ),
        },

        outlineWidth: { value: outlineWidth },
        outlineColor: {
          value: new THREE.Color(outlineColor).toArray().concat(1.0),
        },
      },
      vertexShader: `
        attribute vec3 instancePosition;
        attribute float instanceAnimationIndex;
        attribute float instanceFrameIndex;

        uniform sampler2D frameInfoTexture;
        uniform float frameInfoTextureWidth;
        uniform float frameInfoTextureHeight;

        uniform mat4 projectionMatrix;
        uniform mat4 viewMatrix;
        uniform mat4 modelMatrix;

        uniform vec2 uvTransform;
        uniform vec2 uvOffset;
        uniform vec2 uvScale;

        uniform bool billboarding;

        varying vec2 vUv;
        varying vec4 vFrame;

        void main() {
          vUv = uv;

          vec2 frameInfoTextureCoord = vec2(
            (instanceAnimationIndex + 0.5) / frameInfoTextureWidth,
            (instanceFrameIndex + 0.5) / frameInfoTextureHeight
          );
          vFrame = texture2D(frameInfoTexture, frameInfoTextureCoord);

          vec3 transformedPosition = position;
          if (billboarding) {
              transformedPosition = (modelMatrix * vec4(position, 1.0)).xyz;
              vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
              vec3 cameraUp = vec3(viewMatrix[0][1], viewViewMatrix[1][1], viewMatrix[2][1]);
              transformedPosition += cameraRight * transformedPosition.x + cameraUp * transformedPosition.y;
          }

          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(transformedPosition + instancePosition, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform sampler2D map;
        uniform vec3 color;
        uniform float opacity;

        uniform float outlineWidth;
        uniform vec4 outlineColor;

        uniform vec4 vFrame;
        uniform vec2 uvTransform;
        uniform vec2 uvOffset;
        uniform vec2 uvScale;

        varying vec2 vUv;

        void main() {
          vec2 fullTextureUv = mod(vUv * uvTransform, 1.0) * vFrame.zw + vFrame.xy;
          vec2 texelSize = 1.0 / vec2(textureSize(map, 0));

          vec4 texColor = texture2D(map, fullTextureUv);

          bool isOutline = false;
          for (float x = -outlineWidth; x <= outlineWidth; x += 1.0) {
            for (float y = -outlineWidth; y <= outlineWidth; y += 1.0) {
              if (x == 0.0 && y == 0.0) continue;

              vec2 neighborFullTextureUv = fullTextureUv + vec2(x, y) * texelSize;

              if (neighborFullTextureUv.x >= vFrame.x && neighborFullTextureUv.x <= vFrame.x + vFrame.z &&
                  neighborFullTextureUv.y >= vFrame.y && neighborFullTextureUv.y <= vFrame.y + vFrame.w) {
                vec4 neighborTexColor = texture2D(map, neighborFullTextureUv);
                if (neighborTexColor.a > 0.0) {
                  if (texColor.a < 0.01) {
                    isOutline = true;
                    break;
                  }
                }
              }
            }
            if (isOutline) break;
          }

          if (isOutline) {
            gl_FragColor = outlineColor;
          } else {
            gl_FragColor = texColor * vec4(color, opacity);
          }
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }
}
