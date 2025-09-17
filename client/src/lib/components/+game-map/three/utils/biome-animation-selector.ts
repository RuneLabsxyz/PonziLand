/**
 * Selects a random empty biome animation variation based on land location
 * Uses a noise-like hash function for better distribution
 *
 * @param x - Land X coordinate
 * @param y - Land Y coordinate
 * @returns Animation name (e.g., 'empty_3')
 */
export function selectEmptyBiomeAnimation(x: number, y: number): string {
  // Hash function that creates noise-like distribution
  let hash = (x * 73856093) ^ (y * 19349663);
  hash = hash ^ (hash >> 13);
  hash = hash * 2246822507;
  hash = hash ^ (hash >> 16);

  const variation = Math.abs(hash) % 11; // 11 variations: empty_0 through empty_10
  return `empty_${variation}`;
}
