// Define the token skin type
export interface AnimationData {
  url: string;
  type: 'rowColumn';
  width: number;
  height: number;
  animations: Array<{ name: string; frameRange: [number, number] }>;
  bottomPadding?: number; // Optional bottom padding in pixels
  scale?: number; // Optional scale factor
}

export interface BuildingLevel {
  x: number;
  y: number;
  useAnimation: boolean;
  animations?: AnimationData[];
}

export interface TokenSkin {
  skin: string;
  icon: string;
  biome: { x: number; y: number };
  building: {
    1: BuildingLevel;
    2: BuildingLevel;
    3: BuildingLevel;
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
    }),
);

// Synchronous function to get token metadata directly from ALL_TOKENS
export function getTokenMetadata(skin: string): TokenSkin | null {
  return ALL_TOKENS[skin] || null;
}
