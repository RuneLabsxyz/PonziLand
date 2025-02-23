<script lang="ts">
  import Fog from './fog-tile.svelte';

  let { tiles, tileSize, mapSize } = $props<{
    tiles: any[][];
    tileSize: number;
    mapSize: number;
  }>();

  const ZONE_SIZE = 2;
  const EMPTY_THRESHOLD = 0.75;

  let emptyZones = $derived(calculateEmptyZones(tiles));

  function calculateEmptyZones(tiles: any[][]) {
    const zones: { x: number; y: number }[] = [];
    if (!tiles.length) return zones;

    const potentialZones: { x: number; y: number }[] = [];
    for (let zY = 0; zY < mapSize; zY += ZONE_SIZE) {
      for (let zX = 0; zX < mapSize; zX += ZONE_SIZE) {
        let emptyCount = 0;
        let hasActiveTile = false;

        for (let y = zY; y < Math.min(zY + ZONE_SIZE, mapSize); y++) {
          for (let x = zX; x < Math.min(zX + ZONE_SIZE, mapSize); x++) {
            if (tiles[y][x]?.type === 'grass') {
              emptyCount++;
            } else if (tiles[y][x]) {
              hasActiveTile = true;
              break;
            }
          }
          if (hasActiveTile) break;
        }

        const totalTiles =
          Math.min(ZONE_SIZE, mapSize - zY) * Math.min(ZONE_SIZE, mapSize - zX);
        if (!hasActiveTile && emptyCount / totalTiles >= EMPTY_THRESHOLD) {
          potentialZones.push({ x: zX, y: zY });
        }
      }
    }

    for (const zone of potentialZones) {
      let hasActiveNeighbor = false;
      let hasAnyActiveInRadius = false;
      let allNeighborsFoggy = true;
      const checkRadius = 1;
      const farCheckRadius = 3;

      for (let dy = -checkRadius; dy <= checkRadius; dy++) {
        for (let dx = -checkRadius; dx <= checkRadius; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (Math.abs(dx) + Math.abs(dy) > 1) continue;

          const neighborX = zone.x + dx * ZONE_SIZE;
          const neighborY = zone.y + dy * ZONE_SIZE;

          if (
            neighborX < 0 ||
            neighborY < 0 ||
            neighborX >= mapSize ||
            neighborY >= mapSize
          )
            continue;

          let neighborHasActive = false;
          for (
            let y = neighborY;
            y < Math.min(neighborY + ZONE_SIZE, mapSize);
            y++
          ) {
            for (
              let x = neighborX;
              x < Math.min(neighborX + ZONE_SIZE, mapSize);
              x++
            ) {
              if (tiles[y]?.[x]?.type !== 'grass') {
                neighborHasActive = true;
                hasActiveNeighbor = true;
                hasAnyActiveInRadius = true;
                allNeighborsFoggy = false;
                break;
              }
            }
            if (neighborHasActive) break;
          }
        }
        if (hasActiveNeighbor) break;
      }

      if (!hasActiveNeighbor) {
        for (let dy = -farCheckRadius; dy <= farCheckRadius; dy++) {
          for (let dx = -farCheckRadius; dx <= farCheckRadius; dx++) {
            if (dx === 0 && dy === 0) continue;

            const neighborX = zone.x + dx * ZONE_SIZE;
            const neighborY = zone.y + dy * ZONE_SIZE;

            if (
              neighborX < 0 ||
              neighborY < 0 ||
              neighborX >= mapSize ||
              neighborY >= mapSize
            )
              continue;

            for (
              let y = neighborY;
              y < Math.min(neighborY + ZONE_SIZE, mapSize);
              y++
            ) {
              for (
                let x = neighborX;
                x < Math.min(neighborX + ZONE_SIZE, mapSize);
                x++
              ) {
                if (tiles[y]?.[x]?.type !== 'grass') {
                  hasAnyActiveInRadius = true;
                  break;
                }
              }
              if (hasAnyActiveInRadius) break;
            }
          }
          if (hasAnyActiveInRadius) break;
        }
      }

      const random = Math.random();
      // Add zone if any of:
      // 1. No immediate neighbors and passes random check
      // 2. No active tiles in larger radius (completely isolated)
      // 3. All neighbors are foggy and zone has no active tiles
      if (
        (!hasActiveNeighbor && random > 0.1) ||
        !hasAnyActiveInRadius ||
        allNeighborsFoggy
      ) {
        zones.push(zone);
      }
    }

    return zones;
  }
</script>

{#each emptyZones as zone}
  <Fog
    left={zone.x * tileSize}
    top={zone.y * tileSize}
    width={ZONE_SIZE * tileSize}
    height={ZONE_SIZE * tileSize}
  />
{/each}
