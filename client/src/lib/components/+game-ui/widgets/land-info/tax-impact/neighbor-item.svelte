<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import LandDisplay from '$lib/components/+game-map/land/land-display.svelte';

  let { land }: { land: LandWithActions | undefined | null } = $props();
</script>

{#if land === undefined}
  <LandDisplay grass road />
{:else if land === null}
  <LandDisplay basic grass road />
{:else if land.token}
  <LandDisplay token={land.token} road />
{/if}
