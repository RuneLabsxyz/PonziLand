// Define the token skin type
export interface TokenSkin {
  skin: string;
  icon: string;
  biome: { x: number; y: number };
  building: {
    1: { x: number; y: number; useAnimation: boolean };
    2: { x: number; y: number; useAnimation: boolean };
    3: { x: number; y: number; useAnimation: boolean };
  };
}

// Import all tokens using glob pattern
const tokenModules = import.meta.glob('./*.ts', { eager: true });

// Extract tokens from modules and create typed object
export const ALL_TOKENS: Record<string, TokenSkin> = Object.fromEntries(
  Object.entries(tokenModules)
    .filter(([path]) => !path.includes('index.ts')) // Exclude index file
    .map(([path, mod]) => {
      const tokenName = path.split('/').pop()?.replace('.ts', '') || '';
      return [tokenName, (mod as any)[tokenName]];
    })
);