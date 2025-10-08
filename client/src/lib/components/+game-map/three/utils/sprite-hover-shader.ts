import * as THREE from 'three';
import fragmentFull from '$lib/shaders/sprite/fragment_full.glsl';
import vertexMain from '$lib/shaders/sprite/vertex_main.glsl';
import vertexPars from '$lib/shaders/sprite/vertex_pars.glsl';
import { loadingStore } from '$lib/stores/loading.store.svelte';
import { GRID_SIZE, COORD_MULTIPLIER } from '$lib/const';

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
  setTints: (
    instancedMesh: THREE.InstancedMesh,
    instanceIndices: number[],
    color: THREE.Color,
  ) => void;
  clearTints: (instancedMesh: THREE.InstancedMesh) => void;
  setTintOpacity: (opacity: number) => void;
  setStripedLands: (
    instancedMesh: THREE.InstancedMesh,
    instanceIndices: number[],
    selectedLandIndex?: number,
  ) => void;
  clearStripedLands: (instancedMesh: THREE.InstancedMesh) => void;
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

  // Add tint opacity uniform for heatmap
  mat.uniforms.tintOpacity = { value: 1.0 };

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

    if (!instancedMesh.geometry.attributes.tintState) {
      instancedMesh.geometry.setAttribute(
        'tintState',
        new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
      );
    }

    if (!instancedMesh.geometry.attributes.tintColor) {
      instancedMesh.geometry.setAttribute(
        'tintColor',
        new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3),
      );
    }

    if (!instancedMesh.geometry.attributes.stripedState) {
      instancedMesh.geometry.setAttribute(
        'stripedState',
        new THREE.InstancedBufferAttribute(new Float32Array(count), 1),
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

  // Add afterCompile callback to track shader compilation completion
  (mat as any).onAfterCompile = (
    _shader: any,
    _renderer: THREE.WebGLRenderer,
  ) => {
    console.log('Sprite outline shader compilation complete');
    // Mark shader compilation as loaded in the loading store
    loadingStore.markPhaseItemLoaded('webgl', 'sprite-outline-shader');
  };

  // Track hover/selected states to avoid clearing custom outlines
  let currentHoverIndex = -1;
  let currentSelectedIndex = -1;

  // Track zoom state for stripe application logic
  let currentIsUnzoomed = false;

  // Store current land states for reapplication when zoom changes
  let currentOwnedLands: number[] = [];
  let currentAuctionLands: number[] = [];
  let currentInstancedMesh: THREE.InstancedMesh | null = null;

  // Return control functions
  const controls = {
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

      // Store current state for reapplication on zoom changes
      currentOwnedLands = [...instanceIndices];
      currentInstancedMesh = instancedMesh;

      if (currentIsUnzoomed) {
        // Use old system when unzoomed - set ownedState for shader stripes
        const ownedAttribute = instancedMesh.geometry.attributes
          .ownedState as THREE.InstancedBufferAttribute;
        const ownedArray = ownedAttribute.array as Float32Array;

        // Always reset all to not owned first
        ownedArray.fill(0.0);

        // Set owned lands to 1.0 (only if we have indices)
        if (instanceIndices.length > 0) {
          instanceIndices.forEach((index) => {
            if (index >= 0 && index < ownedArray.length) {
              ownedArray[index] = 1.0;
            }
          });
        }

        ownedAttribute.needsUpdate = true;

        // Don't clear tints when using old system to preserve neighbor highlighting
      } else {
        // Use new system when zoomed - set tint colors only, no stripes
        const ownedAttribute = instancedMesh.geometry.attributes
          .ownedState as THREE.InstancedBufferAttribute;
        const ownedArray = ownedAttribute.array as Float32Array;

        // Clear old system
        ownedArray.fill(0.0);
        ownedAttribute.needsUpdate = true;

        // Apply dark tint for owned lands (dark gray)
        const ownedTintColor = new THREE.Color(0.3, 0.3, 0.3);

        // Set tint state and color for owned lands
        const tintStateAttribute = instancedMesh.geometry.attributes
          .tintState as THREE.InstancedBufferAttribute;
        const tintColorAttribute = instancedMesh.geometry.attributes
          .tintColor as THREE.InstancedBufferAttribute;
        const tintStateArray = tintStateAttribute.array as Float32Array;
        const tintColorArray = tintColorAttribute.array as Float32Array;

        // Only clear tints for owned land indices to preserve neighbor highlighting
        // First reset only the owned land indices
        instanceIndices.forEach((instanceIndex) => {
          if (instanceIndex >= 0 && instanceIndex < tintStateArray.length) {
            tintStateArray[instanceIndex] = 0.0;
            tintColorArray[instanceIndex * 3] = 0.0;
            tintColorArray[instanceIndex * 3 + 1] = 0.0;
            tintColorArray[instanceIndex * 3 + 2] = 0.0;
          }
        });

        // Set tint for owned lands (only if we have indices)
        if (instanceIndices.length > 0) {
          instanceIndices.forEach((instanceIndex) => {
            if (instanceIndex >= 0 && instanceIndex < tintStateArray.length) {
              tintStateArray[instanceIndex] = 1.0;
              tintColorArray[instanceIndex * 3] = ownedTintColor.r;
              tintColorArray[instanceIndex * 3 + 1] = ownedTintColor.g;
              tintColorArray[instanceIndex * 3 + 2] = ownedTintColor.b;
            }
          });
        }

        tintStateAttribute.needsUpdate = true;
        tintColorAttribute.needsUpdate = true;
      }

      mat.uniforms.darkenFactor.value = darkenFactor;

      console.log(
        `Updated ${instanceIndices.length} owned lands using ${currentIsUnzoomed ? 'old' : 'new'} system`,
      );
    },

    setAuctionLands: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndices: number[],
    ) => {
      if (!mat.uniforms) return;

      createBufferAttributes(instancedMesh);

      // Store current state for reapplication on zoom changes
      currentAuctionLands = [...instanceIndices];
      currentInstancedMesh = instancedMesh;

      if (currentIsUnzoomed) {
        // Use old system when unzoomed - set auctionState for shader stripes
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

        auctionAttribute.needsUpdate = true;

        // Don't clear tints when using old system to preserve neighbor highlighting
      } else {
        // Use new system when zoomed - no tint, no stripes for auction lands
        const auctionAttribute = instancedMesh.geometry.attributes
          .auctionState as THREE.InstancedBufferAttribute;
        const auctionArray = auctionAttribute.array as Float32Array;

        // Clear old system
        auctionArray.fill(0.0);
        auctionAttribute.needsUpdate = true;

        // Only clear tints for auction land indices to preserve neighbor highlighting
        const tintStateAttribute = instancedMesh.geometry.attributes
          .tintState as THREE.InstancedBufferAttribute;
        const tintColorAttribute = instancedMesh.geometry.attributes
          .tintColor as THREE.InstancedBufferAttribute;
        const tintStateArray = tintStateAttribute.array as Float32Array;
        const tintColorArray = tintColorAttribute.array as Float32Array;

        // Clear tints only for auction land indices (auction lands have no tint when zoomed)
        instanceIndices.forEach((instanceIndex) => {
          if (instanceIndex >= 0 && instanceIndex < tintStateArray.length) {
            tintStateArray[instanceIndex] = 0.0;
            tintColorArray[instanceIndex * 3] = 0.0;
            tintColorArray[instanceIndex * 3 + 1] = 0.0;
            tintColorArray[instanceIndex * 3 + 2] = 0.0;
          }
        });

        tintStateAttribute.needsUpdate = true;
        tintColorAttribute.needsUpdate = true;
      }

      console.log(
        `Updated ${instanceIndices.length} auction lands using ${currentIsUnzoomed ? 'old' : 'new'} system`,
      );
    },

    setZoomState: (isUnzoomed: boolean) => {
      const wasUnzoomed = currentIsUnzoomed;
      currentIsUnzoomed = isUnzoomed;
      if (mat.uniforms && mat.uniforms.isUnzoomed) {
        mat.uniforms.isUnzoomed.value = isUnzoomed;
      }

      // If zoom state changed, reapply current land states
      if (wasUnzoomed !== isUnzoomed && currentInstancedMesh) {
        reapplyCurrentLandStates();
      }
    },

    setTints: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndices: number[],
      color: THREE.Color,
    ) => {
      createBufferAttributes(instancedMesh);

      const tintStateAttribute = instancedMesh.geometry.attributes
        .tintState as THREE.InstancedBufferAttribute;
      const tintColorAttribute = instancedMesh.geometry.attributes
        .tintColor as THREE.InstancedBufferAttribute;
      const tintStateArray = tintStateAttribute.array as Float32Array;
      const tintColorArray = tintColorAttribute.array as Float32Array;

      // Set tint state and color for specified instances (accumulative)
      instanceIndices.forEach((instanceIndex) => {
        if (instanceIndex >= 0 && instanceIndex < tintStateArray.length) {
          tintStateArray[instanceIndex] = 1.0;
          tintColorArray[instanceIndex * 3] = color.r;
          tintColorArray[instanceIndex * 3 + 1] = color.g;
          tintColorArray[instanceIndex * 3 + 2] = color.b;
        }
      });

      tintStateAttribute.needsUpdate = true;
      tintColorAttribute.needsUpdate = true;
      console.log(
        `Set tints for ${instanceIndices.length} instances with color RGB(${color.r.toFixed(2)}, ${color.g.toFixed(2)}, ${color.b.toFixed(2)})`,
      );
    },

    clearTints: (instancedMesh: THREE.InstancedMesh) => {
      createBufferAttributes(instancedMesh);

      const tintStateAttribute = instancedMesh.geometry.attributes
        .tintState as THREE.InstancedBufferAttribute;
      const tintColorAttribute = instancedMesh.geometry.attributes
        .tintColor as THREE.InstancedBufferAttribute;
      const tintStateArray = tintStateAttribute.array as Float32Array;
      const tintColorArray = tintColorAttribute.array as Float32Array;

      // Clear all tint states and colors
      tintStateArray.fill(0.0);
      tintColorArray.fill(0.0);

      tintStateAttribute.needsUpdate = true;
      tintColorAttribute.needsUpdate = true;
      console.log(`Cleared all tints`);
    },

    setTintOpacity: (opacity: number) => {
      if (mat.uniforms && mat.uniforms.tintOpacity) {
        mat.uniforms.tintOpacity.value = Math.max(0, Math.min(1, opacity));
      }
    },

    setStripedLands: (
      instancedMesh: THREE.InstancedMesh,
      instanceIndices: number[],
      selectedLandIndex?: number,
    ) => {
      createBufferAttributes(instancedMesh);

      const stripedAttribute = instancedMesh.geometry.attributes
        .stripedState as THREE.InstancedBufferAttribute;
      const stripedArray = stripedAttribute.array as Float32Array;

      // Always reset all to not striped first
      stripedArray.fill(0.0);

      // Get tint attributes for applying light blue tint to neighbors
      const tintStateAttribute = instancedMesh.geometry.attributes
        .tintState as THREE.InstancedBufferAttribute;
      const tintColorAttribute = instancedMesh.geometry.attributes
        .tintColor as THREE.InstancedBufferAttribute;
      const tintStateArray = tintStateAttribute.array as Float32Array;
      const tintColorArray = tintColorAttribute.array as Float32Array;

      // Clear existing tints first
      tintStateArray.fill(0.0);
      tintColorArray.fill(0.0);

      // Set striped lands to 1.0 and apply tints (only if we have indices)
      if (instanceIndices.length > 0) {
        // Cyan tint color for neighbors (actual RGB values, not multiplier)
        const cyanTintColor = new THREE.Color(0.0, 1.0, 1.0);
        // Dark tint color for selected land
        const darkTintColor = new THREE.Color(0.0, 0.0, 0.0);

        // Handle neighbors first
        instanceIndices.forEach((instanceIndex) => {
          // WE NEED TO TRANSPOSE FOR SPRITES WAY OF SHOWING TILES
          if (instanceIndex >= 0 && instanceIndex < stripedArray.length) {
            // The instanceIndex comes from neighbor locations which use COORD_MULTIPLIER encoding
            // instanceIndex = row * COORD_MULTIPLIER + col
            const col = Math.floor(instanceIndex / COORD_MULTIPLIER);
            const row = instanceIndex % COORD_MULTIPLIER;

            // Convert to sprite index which uses GRID_SIZE encoding
            // spriteIndex = row * GRID_SIZE + col
            const spriteIndex = row * GRID_SIZE + col;

            // Apply both stripes AND cyan tint for neighbors
            if (spriteIndex >= 0 && spriteIndex < stripedArray.length) {
              // Set striped state
              stripedArray[spriteIndex] = 1.0;

              // Apply cyan tint for neighbors
              tintStateArray[spriteIndex] = 0.1;
              tintColorArray[spriteIndex * 3] = cyanTintColor.r;
              tintColorArray[spriteIndex * 3 + 1] = cyanTintColor.g;
              tintColorArray[spriteIndex * 3 + 2] = cyanTintColor.b;
            }

            console.log(
              `[Debug] Setting stripes AND cyan tint for neighbor index ${instanceIndex} (row=${row}, col=${col}) -> spriteIndex ${spriteIndex}`,
            );
          }
        });

        // Handle selected land separately if provided
        if (selectedLandIndex !== undefined) {
          if (
            selectedLandIndex >= 0 &&
            selectedLandIndex < stripedArray.length
          ) {
            // Transform selected land index the same way
            const selectedCol = Math.floor(
              selectedLandIndex / COORD_MULTIPLIER,
            );
            const selectedRow = selectedLandIndex % COORD_MULTIPLIER;
            const selectedSpriteIndex = selectedRow * GRID_SIZE + selectedCol;

            // Apply both stripes AND dark tint for selected land
            if (
              selectedSpriteIndex >= 0 &&
              selectedSpriteIndex < stripedArray.length
            ) {
              // Set striped state
              stripedArray[selectedSpriteIndex] = 1.0;

              // Apply dark tint for selected land
              tintStateArray[selectedSpriteIndex] = 0.7;
              tintColorArray[selectedSpriteIndex * 3] = darkTintColor.r;
              tintColorArray[selectedSpriteIndex * 3 + 1] = darkTintColor.g;
              tintColorArray[selectedSpriteIndex * 3 + 2] = darkTintColor.b;
            }

            console.log(
              `[Debug] Setting stripes AND dark tint for selected index ${selectedLandIndex} (row=${selectedRow}, col=${selectedCol}) -> spriteIndex ${selectedSpriteIndex}`,
            );
          }
        }
      }

      // Update all attributes
      tintStateAttribute.needsUpdate = true;
      tintColorAttribute.needsUpdate = true;

      // Always mark as needing update, even for empty arrays
      stripedAttribute.needsUpdate = true;

      console.log(
        `Updated ${instanceIndices.length} striped lands via instanced buffer attributes (cleared all first)`,
      );
    },

    clearStripedLands: (instancedMesh: THREE.InstancedMesh) => {
      createBufferAttributes(instancedMesh);

      const stripedAttribute = instancedMesh.geometry.attributes
        .stripedState as THREE.InstancedBufferAttribute;
      const stripedArray = stripedAttribute.array as Float32Array;

      // Also clear tint states since we apply tints with stripes
      const tintStateAttribute = instancedMesh.geometry.attributes
        .tintState as THREE.InstancedBufferAttribute;
      const tintColorAttribute = instancedMesh.geometry.attributes
        .tintColor as THREE.InstancedBufferAttribute;
      const tintStateArray = tintStateAttribute.array as Float32Array;
      const tintColorArray = tintColorAttribute.array as Float32Array;

      // Clear all striped states and their associated tints
      stripedArray.fill(0.0);
      tintStateArray.fill(0.0);
      tintColorArray.fill(0.0);

      stripedAttribute.needsUpdate = true;
      tintStateAttribute.needsUpdate = true;
      tintColorAttribute.needsUpdate = true;
      console.log(`Cleared all striped lands and their tints`);
    },
  };

  // Helper method to reapply current land states after zoom changes
  const reapplyCurrentLandStates = () => {
    if (!currentInstancedMesh) return;

    // Reapply owned lands with current zoom state
    if (currentOwnedLands.length > 0) {
      const mesh = currentInstancedMesh;
      const indices = [...currentOwnedLands];
      // Clear stored state to prevent recursion, then reapply
      currentOwnedLands = [];
      controls.setOwnedLands(mesh, indices);
    }

    // Reapply auction lands with current zoom state
    if (currentAuctionLands.length > 0) {
      const mesh = currentInstancedMesh;
      const indices = [...currentAuctionLands];
      // Clear stored state to prevent recursion, then reapply
      currentAuctionLands = [];
      controls.setAuctionLands(mesh, indices);
    }
  };

  return controls;
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
