import type { SpritesheetMetadata } from '@threlte/extras';
import { ALL_TOKENS } from '$lib/tokens';

// Calculate building frame from coordinates (12-column grid)
const getBuildingFrame = (x: number, y: number) => y * 12 + x;

// BUILDING
export const buildingAtlasMeta = [
  {
    url: '/tokens/+global/buildings.png',
    type: 'rowColumn',
    width: 12,
    height: 21,
    animations: [
      // Non-token entries (keep hardcoded)
      { name: 'empty', frameRange: [250, 250] },
      { name: 'empty_1', frameRange: [250, 250] },
      { name: 'empty_2', frameRange: [250, 250] },
      { name: 'empty_3', frameRange: [250, 250] },

      { name: 'auction', frameRange: [250, 250] },
      { name: 'auction_1', frameRange: [250, 250] },
      { name: 'auction_2', frameRange: [250, 250] },
      { name: 'auction_3', frameRange: [250, 250] },

      // Token entries (calculated from token data)
      ...Object.entries(ALL_TOKENS).flatMap(([tokenName, token]) =>
        [1, 2, 3]
          .map((level) => {
            const building =
              token.building[level as keyof typeof token.building];

            // Only include static buildings (animations are handled separately)
            if (!building.useAnimation) {
              const frame = getBuildingFrame(building.x, building.y);
              return {
                name: `${tokenName}_${level}`,
                frameRange: [frame, frame] as [number, number],
              };
            }
            return null;
          })
          .filter(
            (item): item is { name: string; frameRange: [number, number] } =>
              item !== null,
          ),
      ),
    ],
  },

  // DYNAMIC ANIMATIONS (Generated from token data)

  // Generate animation entries for tokens that have animations
  ...Object.entries(ALL_TOKENS).flatMap(([tokenName, token]) =>
    [1, 2, 3].flatMap((level) => {
      const building = token.building[level as keyof typeof token.building];

      // Only include animated buildings
      if (building.useAnimation && building.animations) {
        return building.animations.map((animData) => ({
          url: animData.url,
          type: animData.type,
          width: animData.width,
          height: animData.height,
          animations: animData.animations.map((anim) => ({
            name: `${tokenName}_${level}`,
            frameRange: anim.frameRange,
          })),
        }));
      }
      return [];
    }),
  ),
] as const satisfies SpritesheetMetadata;
