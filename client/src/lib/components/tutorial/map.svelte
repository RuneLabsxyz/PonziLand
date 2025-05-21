<script lang="ts">
  import { tutorialLandStore } from './stores.svelte';
  import GameGrid from '$lib/components/+game-map/game-grid.svelte';
</script>

<GameGrid />

<style>
  :global(body) {
    overflow: hidden;
  }
</style>
