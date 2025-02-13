<script lang="ts">
  import LandDisplay from '$lib/components/land/land-display.svelte';
  import NeighborItem from './neighbor-item.svelte';

  let {
    filteredNeighbors,
    selectedToken,
  }: { filteredNeighbors: any; selectedToken: any } = $props();
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
    {#if selectedToken?.symbol}<LandDisplay token={selectedToken} />{:else}
      <LandDisplay basic />
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
