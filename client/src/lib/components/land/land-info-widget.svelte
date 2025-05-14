<script lang="ts">
  import LandInfoModal from './land-info-modal.svelte';
  import type { BaseLand } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';

  let { land } = $props<{ land: BaseLand }>();
</script>

<div class="land-info-widget">
  <LandInfoModal {land} />
</div>

<style>
  .land-info-widget {
    min-width: 300px;
    min-height: 200px;
  }
</style> 