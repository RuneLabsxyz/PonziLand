<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import type { Token } from '$lib/interfaces';
  import LandDisplay from '$lib/components/+game-map/land/land-display.svelte';
  import NeighborItem from './neighbor-item.svelte';

  let {
    neighbors,
    nbNeighbors,
    selectedToken,
  }: {
    neighbors: any;
    nbNeighbors: number;
    selectedToken: Token | undefined;
  } = $props();

  let filteredNeighbors = $derived.by(() => {
    const allNeighbors = neighbors.getBaseLandsArray();
    const filteredArray = allNeighbors.slice(0, nbNeighbors);

    // Pre-compute neighbor positions for O(1) lookup
    const neighborPositions = {
      up: neighbors.getUp(),
      upRight: neighbors.getUpRight(),
      right: neighbors.getRight(),
      downRight: neighbors.getDownRight(),
      down: neighbors.getDown(),
      downLeft: neighbors.getDownLeft(),
      left: neighbors.getLeft(),
      upLeft: neighbors.getUpLeft(),
    };

    // Create a Set for O(1) filtered neighbor lookup
    const filteredSet = new Set(filteredArray);

    // Map positions to their filtered neighbors (or null/undefined)
    const positions = Object.fromEntries(
      Object.entries(neighborPositions).map(([key, neighbor]) => [
        key,
        neighbor && filteredSet.has(neighbor) ? neighbor : undefined,
      ]),
    ) as Record<string, LandWithActions | undefined | null>;

    // Fill empty positions if we need more neighbors
    if (allNeighbors.length < nbNeighbors) {
      const emptyCount = nbNeighbors - allNeighbors.length;
      const directions = [
        'upLeft',
        'up',
        'upRight',
        'right',
        'downRight',
        'down',
        'downLeft',
        'left',
      ];

      let filled = 0;
      for (const direction of directions) {
        if (filled >= emptyCount) break;
        if (positions[direction] === undefined) {
          positions[direction] = null;
          filled++;
        }
      }
    }

    return {
      array: filteredArray,
      up: positions.up,
      upRight: positions.upRight,
      right: positions.right,
      downRight: positions.downRight,
      down: positions.down,
      downLeft: positions.downLeft,
      left: positions.left,
      upLeft: positions.upLeft,
    };
  });
</script>

<div class="grid grid-cols-3 w-fit">
  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.upLeft} />
  </div>
  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.up} />
  </div>
  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.upRight} />
  </div>

  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.left} />
  </div>

  <!--Own Land-->
  <div class="w-10 h-10 bg-gray-400 border-yellow-500 border">
    {#if selectedToken?.symbol}<LandDisplay token={selectedToken} road />{:else}
      <LandDisplay basic grass road />
    {/if}
  </div>

  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.right} />
  </div>

  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.downLeft} />
  </div>
  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.down} />
  </div>
  <div class="w-10 h-10 bg-gray-400">
    <NeighborItem land={filteredNeighbors.downRight} />
  </div>
</div>
