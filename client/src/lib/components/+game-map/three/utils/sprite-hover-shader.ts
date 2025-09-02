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
  setHover: (instancedMesh: THREE.InstancedMesh, instanceIndex: number) => void;
  setSelected: (
    instancedMesh: THREE.InstancedMesh,
    instanceIndex: number,
  ) => void;
  setCustomOutlines: (
    instancedMesh: THREE.InstancedMesh,
    instanceIndices: number[],
    color: THREE.Color,
  ) => void;
  clearOutlines: (instancedMesh: THREE.InstancedMesh) => void;
  setOutlineWidth: (width: number) => void;
  setResolution: (width: number, height: number) => void;
  updateTime: (time: number) => void;
  setOwnedLands: (
    instancedMesh: THREE.InstancedMesh,
    instanceIndices: number[],
    darkenFactor?: number,
  ) => void;
  setAuctionLands: (
    instancedMesh: THREE.InstancedMesh,
    instanceIndices: number[],
  ) => void;
  setZoomState: (isUnzoomed: boolean) => void;
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
  const { outlineWidth = 2.0, resolution = new THREE.Vector2(2048, 2048) } =
    options;

  const mat = material as any;

  // Add uniforms to the shader
  mat.uniforms.outlineWidth = { value: outlineWidth };
  mat.uniforms.resolution = { value: resolution };
  mat.uniforms.time = { value: 0.0 };

  // Add owned land uniforms
  mat.uniforms.darkenFactor = { value: 0.4 };
  mat.uniforms.darkenOnlyWhenUnzoomed = { value: true };
  mat.uniforms.isUnzoomed = { value: false };

  // Helper function to create buffer attributes
  const createBufferAttributes = (instancedMesh: THREE.InstancedMesh) => {
    const count = instancedMesh.count;

    if (!instancedMesh.geometry.attributes.ownedState) {
      instancedMesh.geometry.setAttribute(
        'ownedState',
        new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
      );
    }

    if (!instancedMesh.geometry.attributes.auctionState) {
      instancedMesh.geometry.setAttribute(
        'auctionState',
        new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
      );
    }

    if (!instancedMesh.geometry.attributes.outlineState) {
      instancedMesh.geometry.setAttribute(
        'outlineState',
        new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
      );
    }

    if (!instancedMesh.geometry.attributes.outlineColor) {
      instancedMesh.geometry.setAttribute(
        'outlineColor',
        new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3),
      );
    }
  };

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

  // Track hover/selected states to avoid clearing custom outlines
  let currentHoverIndex = -1;
  let currentSelectedIndex = -1;

  // Return control functions
  return {
    setHover: (instancedMesh: THREE.InstancedMesh, instanceIndex: number) => {
      createBufferAttributes(instancedMesh);

      const outlineStateAttribute = instancedMesh.geometry.attributes
        .outlineState as THREE.InstancedBufferAttribute;
      const outlineColorAttribute = instancedMesh.geometry.attributes
        .outlineColor as THREE.InstancedBufferAttribute;
      const outlineStateArray = outlineStateAttribute.array as Float32Array;
      const outlineColorArray = outlineColorAttribute.array as Float32Array;

      // Clear only the previous hover instance if it was different from current selected
      if (
        currentHoverIndex >= 0 &&
        currentHoverIndex !== currentSelectedIndex &&
        currentHoverIndex < outlineStateArray.length
      ) {
        outlineStateArray[currentHoverIndex] = 0.0;
        outlineColorArray[currentHoverIndex * 3] = 0.0;
        outlineColorArray[currentHoverIndex * 3 + 1] = 0.0;
        outlineColorArray[currentHoverIndex * 3 + 2] = 0.0;
      }

      // Set new hover state and cyan color for the specific instance
      if (instanceIndex >= 0 && instanceIndex < outlineStateArray.length) {
        outlineStateArray[instanceIndex] = 1.0;
        // Cyan color (0, 1, 1)
        outlineColorArray[instanceIndex * 3] = 0.0; // R
        outlineColorArray[instanceIndex * 3 + 1] = 1.0; // G
        outlineColorArray[instanceIndex * 3 + 2] = 1.0; // B
      }

      currentHoverIndex = instanceIndex;
      outlineStateAttribute.needsUpdate = true;
      outlineColorAttribute.needsUpdate = true;
    },

    setSelected: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndex: number,
    ) => {
      createBufferAttributes(instancedMesh);

      const outlineStateAttribute = instancedMesh.geometry.attributes
        .outlineState as THREE.InstancedBufferAttribute;
      const outlineColorAttribute = instancedMesh.geometry.attributes
        .outlineColor as THREE.InstancedBufferAttribute;
      const outlineStateArray = outlineStateAttribute.array as Float32Array;
      const outlineColorArray = outlineColorAttribute.array as Float32Array;

      // Clear only the previous selected instance
      if (
        currentSelectedIndex >= 0 &&
        currentSelectedIndex < outlineStateArray.length
      ) {
        outlineStateArray[currentSelectedIndex] = 0.0;
        outlineColorArray[currentSelectedIndex * 3] = 0.0;
        outlineColorArray[currentSelectedIndex * 3 + 1] = 0.0;
        outlineColorArray[currentSelectedIndex * 3 + 2] = 0.0;
      }

      // Set new selected state and yellow color for the specific instance
      if (instanceIndex >= 0 && instanceIndex < outlineStateArray.length) {
        outlineStateArray[instanceIndex] = 1.0;
        // Yellow color (1, 1, 0)
        outlineColorArray[instanceIndex * 3] = 1.0; // R
        outlineColorArray[instanceIndex * 3 + 1] = 1.0; // G
        outlineColorArray[instanceIndex * 3 + 2] = 0.0; // B
      }

      currentSelectedIndex = instanceIndex;
      outlineStateAttribute.needsUpdate = true;
      outlineColorAttribute.needsUpdate = true;
    },

    setCustomOutlines: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndices: number[],
      color: THREE.Color,
    ) => {
      createBufferAttributes(instancedMesh);

      const outlineStateAttribute = instancedMesh.geometry.attributes
        .outlineState as THREE.InstancedBufferAttribute;
      const outlineColorAttribute = instancedMesh.geometry.attributes
        .outlineColor as THREE.InstancedBufferAttribute;
      const outlineStateArray = outlineStateAttribute.array as Float32Array;
      const outlineColorArray = outlineColorAttribute.array as Float32Array;

      // Set custom outline state and color for specified instances
      instanceIndices.forEach((instanceIndex) => {
        if (instanceIndex >= 0 && instanceIndex < outlineStateArray.length) {
          outlineStateArray[instanceIndex] = 1.0;
          outlineColorArray[instanceIndex * 3] = color.r;
          outlineColorArray[instanceIndex * 3 + 1] = color.g;
          outlineColorArray[instanceIndex * 3 + 2] = color.b;
        }
      });

      // Reapply hover state if it exists and wasn't overwritten
      if (
        currentHoverIndex >= 0 &&
        currentHoverIndex < outlineStateArray.length
      ) {
        outlineStateArray[currentHoverIndex] = 1.0;
        // Cyan color (0, 1, 1)
        outlineColorArray[currentHoverIndex * 3] = 0.0;
        outlineColorArray[currentHoverIndex * 3 + 1] = 1.0;
        outlineColorArray[currentHoverIndex * 3 + 2] = 1.0;
      }

      // Reapply selected state if it exists and wasn't overwritten
      if (
        currentSelectedIndex >= 0 &&
        currentSelectedIndex < outlineStateArray.length
      ) {
        outlineStateArray[currentSelectedIndex] = 1.0;
        // Yellow color (1, 1, 0)
        outlineColorArray[currentSelectedIndex * 3] = 1.0;
        outlineColorArray[currentSelectedIndex * 3 + 1] = 1.0;
        outlineColorArray[currentSelectedIndex * 3 + 2] = 0.0;
      }

      outlineStateAttribute.needsUpdate = true;
      outlineColorAttribute.needsUpdate = true;
      console.log(
        `Set custom outlines for ${instanceIndices.length} instances with color RGB(${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)}), preserving hover/selected states`,
      );
    },

    clearOutlines: (instancedMesh: THREE.InstancedMesh) => {
      createBufferAttributes(instancedMesh);

      const outlineStateAttribute = instancedMesh.geometry.attributes
        .outlineState as THREE.InstancedBufferAttribute;
      const outlineColorAttribute = instancedMesh.geometry.attributes
        .outlineColor as THREE.InstancedBufferAttribute;
      const outlineStateArray = outlineStateAttribute.array as Float32Array;
      const outlineColorArray = outlineColorAttribute.array as Float32Array;

      // Clear all outline states and colors
      outlineStateArray.fill(0.0);
      outlineColorArray.fill(0.0);

      outlineStateAttribute.needsUpdate = true;
      outlineColorAttribute.needsUpdate = true;
      console.log(`Cleared all outlines`);
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

    setOwnedLands: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndices: number[],
      darkenFactor = 0.4,
    ) => {
      if (!mat.uniforms) return;

      createBufferAttributes(instancedMesh);

      const ownedAttribute = instancedMesh.geometry.attributes
        .ownedState as THREE.InstancedBufferAttribute;
      const ownedArray = ownedAttribute.array as Float32Array;

      // Always reset all to not owned first (crucial for handling shrinking arrays)
      ownedArray.fill(0.0);

      // Set owned lands to 1.0 (only if we have indices)
      if (instanceIndices.length > 0) {
        instanceIndices.forEach((index) => {
          if (index >= 0 && index < ownedArray.length) {
            ownedArray[index] = 1.0;
          }
        });
      }

      // Always mark as needing update, even for empty arrays
      ownedAttribute.needsUpdate = true;
      mat.uniforms.darkenFactor.value = darkenFactor;

      console.log(
        `Updated ${instanceIndices.length} owned lands via instanced buffer attributes (cleared all first)`,
      );
    },

    setAuctionLands: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndices: number[],
    ) => {
      if (!mat.uniforms) return;

      createBufferAttributes(instancedMesh);

      const auctionAttribute = instancedMesh.geometry.attributes
        .auctionState as THREE.InstancedBufferAttribute;
      const auctionArray = auctionAttribute.array as Float32Array;

      // Always reset all to not auction first
      auctionArray.fill(0.0);

      // Set auction lands to 1.0 (only if we have indices)
      if (instanceIndices.length > 0) {
        instanceIndices.forEach((index) => {
          if (index >= 0 && index < auctionArray.length) {
            auctionArray[index] = 1.0;
          }
        });
      }

      // Always mark as needing update, even for empty arrays
      auctionAttribute.needsUpdate = true;

      console.log(
        `Updated ${instanceIndices.length} auction lands via instanced buffer attributes (cleared all first)`,
      );
    },

    setZoomState: (isUnzoomed: boolean) => {
      if (mat.uniforms && mat.uniforms.isUnzoomed) {
        mat.uniforms.isUnzoomed.value = isUnzoomed;
      }
    },
  };
}

/**
 * Helper function to handle cursor state changes with outline controls
 * @param outlineControls The outline controls instance
 * @param instancedMesh The instanced mesh to apply states to
 * @param hoveredIndex Currently hovered tile index (-1 if none)
 * @param selectedIndex Currently selected tile index (-1 if none)
 */
export function handleCursorState(
  outlineControls: OutlineControls | null,
  instancedMesh: THREE.InstancedMesh | null,
  hoveredIndex: number,
  selectedIndex: number,
): void {
  if (!outlineControls || !instancedMesh) return;

  // Apply selected state (this will clear previous selected if different)
  outlineControls.setSelected(instancedMesh, selectedIndex);

  // Apply hover state (this will clear previous hover if different and not selected)
  // Hover state shows even when something is selected (hover overrides selected visually)
  outlineControls.setHover(instancedMesh, hoveredIndex);
}
