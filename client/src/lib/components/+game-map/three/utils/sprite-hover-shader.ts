import * as THREE from 'three';
import fragmentFull from '$lib/shaders/sprite/fragment_full.glsl';
import vertexMain from '$lib/shaders/sprite/vertex_main.glsl';
import vertexPars from '$lib/shaders/sprite/vertex_pars.glsl';

export interface OutlineShaderOptions {
  outlineColor?: THREE.Color;
  pulseColor?: THREE.Color;
  outlineWidth?: number;
  resolution?: THREE.Vector2;
}

export interface OutlineInstanceConfig {
  instanceIndex: number;
  outlineColor?: THREE.Color;
  pulseColor?: THREE.Color;
}

export interface OutlineControls {
  setHover: (instanceIndex: number) => void;
  setMultipleOutlines: (instances: OutlineInstanceConfig[]) => void;
  setOutlineColor: (color: THREE.Color) => void;
  setPulseColor: (color: THREE.Color) => void;
  setOutlineWidth: (width: number) => void;
  setResolution: (width: number, height: number) => void;
  updateTime: (time: number) => void;
}

/**
 * Sets up outline/hover shader for instanced sprites
 * @param material The material to modify
 * @param options Configuration options for the outline shader
 * @returns Control functions for managing hover states and colors
 */
export function setupOutlineShader(
  material: THREE.Material,
  options: OutlineShaderOptions = {},
): OutlineControls {
  const {
    outlineColor = new THREE.Color(1.0, 0.0, 0.0), // Red outline
    pulseColor = new THREE.Color(1.0, 1.0, 0.0), // Yellow pulse
    outlineWidth = 2.0,
    resolution = new THREE.Vector2(2048, 2048),
  } = options;

  const mat = material as any;

  // Initialize arrays for multiple instance support
  const maxInstances = 32;
  const instanceIndices = new Float32Array(maxInstances).fill(-1);
  const outlineColorsArray = [];
  const pulseColorsArray = [];

  for (let i = 0; i < maxInstances; i++) {
    outlineColorsArray.push(outlineColor.r, outlineColor.g, outlineColor.b);
    pulseColorsArray.push(pulseColor.r, pulseColor.g, pulseColor.b);
  }

  // Add uniforms to the shader
  mat.uniforms.hoverState = { value: 0.0 };
  mat.uniforms.hoveredInstanceIndex = { value: -1.0 }; // Keep for backward compatibility
  mat.uniforms.hoveredInstanceIndices = { value: instanceIndices };
  mat.uniforms.numOutlinedInstances = { value: 0 };
  mat.uniforms.outlineColor = { value: outlineColor }; // Keep for backward compatibility
  mat.uniforms.pulseColor = { value: pulseColor }; // Keep for backward compatibility
  mat.uniforms.outlineColors = { value: new Float32Array(outlineColorsArray) };
  mat.uniforms.pulseColors = { value: new Float32Array(pulseColorsArray) };
  mat.uniforms.outlineWidth = { value: outlineWidth };
  mat.uniforms.resolution = { value: resolution };
  mat.uniforms.time = { value: 0.0 };

  mat.onBeforeCompile = (shader: any) => {
    console.log('Setting up outline shader for sprites');

    // Inject vertex shader code
    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      vertexPars + '\nvoid main() {',
    );

    shader.vertexShader = shader.vertexShader.replace(
      'void main() {',
      'void main() {' + '\n\t' + vertexMain + '\n\t',
    );

    // Replace fragment shader completely
    shader.fragmentShader = fragmentFull;
    console.log('Shader injection complete');
  };

  // Return control functions
  return {
    setHover: (instanceIndex: number) => {
      if (
        mat.uniforms &&
        mat.uniforms?.hoverState != undefined &&
        mat.uniforms?.hoveredInstanceIndex != undefined
      ) {
        mat.uniforms.hoverState.value = instanceIndex >= 0 ? 1.0 : 0.0;
        mat.uniforms.hoveredInstanceIndex.value = instanceIndex;

        // Also update the new array-based system for backward compatibility
        if (instanceIndex >= 0) {
          const indices = new Float32Array(maxInstances).fill(-1);
          indices[0] = instanceIndex;
          mat.uniforms.hoveredInstanceIndices.value = indices;
          mat.uniforms.numOutlinedInstances.value = 1;
        } else {
          mat.uniforms.numOutlinedInstances.value = 0;
        }
      }
    },

    setMultipleOutlines: (instances: OutlineInstanceConfig[]) => {
      if (!mat.uniforms) return;

      const indices = new Float32Array(maxInstances).fill(-1);
      const colors = new Float32Array(maxInstances * 3);
      const pulseColors = new Float32Array(maxInstances * 3);

      const numInstances = Math.min(instances.length, maxInstances);

      for (let i = 0; i < numInstances; i++) {
        const config = instances[i];
        indices[i] = config.instanceIndex;

        const outlineColor =
          config.outlineColor || new THREE.Color(1.0, 0.0, 0.0);
        const pulseColor = config.pulseColor || new THREE.Color(1.0, 1.0, 0.0);

        colors[i * 3] = outlineColor.r;
        colors[i * 3 + 1] = outlineColor.g;
        colors[i * 3 + 2] = outlineColor.b;

        pulseColors[i * 3] = pulseColor.r;
        pulseColors[i * 3 + 1] = pulseColor.g;
        pulseColors[i * 3 + 2] = pulseColor.b;
      }

      mat.uniforms.hoveredInstanceIndices.value = indices;
      mat.uniforms.outlineColors.value = colors;
      mat.uniforms.pulseColors.value = pulseColors;
      mat.uniforms.numOutlinedInstances.value = numInstances;
      mat.uniforms.hoverState.value = numInstances > 0 ? 1.0 : 0.0;
    },

    setOutlineColor: (color: THREE.Color) => {
      if (mat.uniforms && mat.uniforms.outlineColor) {
        mat.uniforms.outlineColor.value.copy(color);
      }
    },

    setPulseColor: (color: THREE.Color) => {
      if (mat.uniforms && mat.uniforms.pulseColor) {
        mat.uniforms.pulseColor.value.copy(color);
      }
    },

    setOutlineWidth: (width: number) => {
      if (mat.uniforms && mat.uniforms.outlineWidth) {
        mat.uniforms.outlineWidth.value = width;
      }
    },

    setResolution: (width: number, height: number) => {
      if (mat.uniforms && mat.uniforms.resolution) {
        mat.uniforms.resolution.value.set(width, height);
      }
    },

    updateTime: (time: number) => {
      if (mat.uniforms && mat.uniforms.time) {
        mat.uniforms.time.value = time;
      }
    },
  };
}

/**
 * Helper function to handle cursor state changes with outline controls
 * @param outlineControls The outline controls instance
 * @param hoveredIndex Currently hovered tile index (-1 if none)
 * @param selectedIndex Currently selected tile index (-1 if none)
 */
export function handleCursorState(
  outlineControls: OutlineControls | null,
  hoveredIndex: number,
  selectedIndex: number,
): void {
  if (!outlineControls) return;

  const instances: OutlineInstanceConfig[] = [];

  // Add selected instance if it exists
  if (selectedIndex >= 0) {
    instances.push({
      instanceIndex: selectedIndex,
      outlineColor: new THREE.Color(0xffff00), // Green for selected
      pulseColor: new THREE.Color(0x00ffff), // Cyan pulse for selected
    });
  }

  // Add hovered instance if it exists and is different from selected
  if (hoveredIndex >= 0 && hoveredIndex !== selectedIndex) {
    instances.push({
      instanceIndex: hoveredIndex,
      outlineColor: new THREE.Color(0x00ffff), // Red for hovered
      pulseColor: new THREE.Color(0xffff00), // Yellow pulse for hovered
    });
  }

  // Apply the outlines using the new multi-instance system
  outlineControls.setMultipleOutlines(instances);
}
