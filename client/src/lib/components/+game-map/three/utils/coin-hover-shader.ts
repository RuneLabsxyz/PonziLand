import { Color, ShaderMaterial, Vector2, type Texture } from 'three';

import coinOutlineVertexShader from '$lib/shaders/coin_vertex.glsl';
import coinOutlineFragmentShader from '$lib/shaders/coin_fragment.glsl';

export class CoinHoverShaderMaterial extends ShaderMaterial {
  constructor(texture: Texture) {
    super({
      uniforms: {
        map: { value: texture },
        outlineColor: { value: new Color(0xffd700) }, // Gold outline
        pulseColor: { value: new Color(0xffff00) }, // Bright yellow pulse
        outlineWidth: { value: 1.0 },
        time: { value: 0.0 },
        resolution: { value: new Vector2(texture.height, texture.width) },
        hoverState: { value: 0.0 },
        hoveredInstanceIndex: { value: -1.0 }, // Initialize to -1
      },
      vertexShader: coinOutlineVertexShader,
      fragmentShader: coinOutlineFragmentShader,
      transparent: true,
      alphaTest: 0.1,
    });
  }

  updateTime(time: number) {
    this.uniforms.time.value = time;
  }

  setHoverState(isHovered: boolean, instanceIndex?: number) {
    this.uniforms.hoverState.value = isHovered ? 1.0 : 0.0;
    this.uniforms.hoveredInstanceIndex.value = instanceIndex ?? -1.0;
  }

  setOutlineColor(color: Color | number) {
    this.uniforms.outlineColor.value =
      color instanceof Color ? color : new Color(color);
  }

  setOutlineWidth(width: number) {
    this.uniforms.outlineWidth.value = width;
  }

  setInstanceHover(instanceIndex: number, isHovered: boolean) {
    if (isHovered) {
      this.uniforms.hoverState.value = 1.0;
      this.uniforms.hoveredInstanceIndex.value = instanceIndex;
    } else {
      // Only clear if this instance was the one being hovered
      if (this.uniforms.hoveredInstanceIndex.value === instanceIndex) {
        this.uniforms.hoverState.value = 0.0;
        this.uniforms.hoveredInstanceIndex.value = -1.0;
      }
    }
  }

  dispose() {
    // Dispose uniform objects that hold references
    // Note: Color and Vector2 objects in uniforms don't have dispose methods,
    // but we should null them to help garbage collection
    if (this.uniforms.outlineColor?.value) {
      this.uniforms.outlineColor.value = null;
    }
    if (this.uniforms.pulseColor?.value) {
      this.uniforms.pulseColor.value = null;
    }
    if (this.uniforms.resolution?.value) {
      this.uniforms.resolution.value = null;
    }

    // Call parent dispose
    super.dispose();
  }
}
