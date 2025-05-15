<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import LandInfoModal from './land-info-modal.svelte';

  let { land } = $props<{ land: LandWithActions }>();
</script>

<div class="land-info-widget">
  {#if land}
    <LandInfoModal {land} />
  {/if}
</div>

<style>
  .land-info-widget {
    min-width: 300px;
    min-height: 200px;
  }
</style>
