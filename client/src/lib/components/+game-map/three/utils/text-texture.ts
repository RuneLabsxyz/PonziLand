import { CanvasTexture, NearestFilter } from 'three';

export interface TextTextureOptions {
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  backgroundColor?: string;
  padding?: number;
  width?: number;
  height?: number;
}

export function createTextTexture(
  text: string,
  options: TextTextureOptions = {}
): CanvasTexture {
  const {
    fontSize = 32,
    fontFamily = 'PonziNumber, monospace',
    color = '#ff0000',
    backgroundColor = 'transparent',
    padding = 4,
    width = 128,
    height = 64,
  } = options;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not get canvas context');
  }

  // Set background
  if (backgroundColor !== 'transparent') {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  }

  // Configure text
  context.font = `${fontSize}px ${fontFamily}`;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  // Add text shadow for better visibility
  context.shadowColor = 'rgba(0, 0, 0, 0.8)';
  context.shadowBlur = 2;
  context.shadowOffsetX = 1;
  context.shadowOffsetY = 1;

  // Draw text
  context.fillText(text, width / 2, height / 2);

  // Create texture
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.needsUpdate = true;

  return texture;
}

export class TextTextureCache {
  private cache = new Map<string, CanvasTexture>();

  get(text: string, options: TextTextureOptions = {}): CanvasTexture {
    const key = JSON.stringify({ text, ...options });
    
    if (!this.cache.has(key)) {
      this.cache.set(key, createTextTexture(text, options));
    }

    return this.cache.get(key)!;
  }

  clear(): void {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
  }

  delete(text: string, options: TextTextureOptions = {}): void {
    const key = JSON.stringify({ text, ...options });
    const texture = this.cache.get(key);
    if (texture) {
      texture.dispose();
      this.cache.delete(key);
    }
  }
}