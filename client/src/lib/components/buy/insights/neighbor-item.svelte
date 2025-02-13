<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import LandDisplay from '$lib/components/land/land-display.svelte';

  let { land }: { land: LandWithActions | undefined | null } = $props();
</script>

{#if land === undefined}
  <LandDisplay />
{:else if land === null}
  <LandDisplay basic />
{:else if land.token}
  <LandDisplay token={land.token} />
{/if}
