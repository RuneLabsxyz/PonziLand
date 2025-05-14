<script lang="ts">
  import BuyModal from './buy-modal.svelte';
  import type { BaseLand } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';

  let { land } = $props<{ land: BaseLand }>();
</script>

<div class="buy-land-widget">
  <BuyModal {land} />
</div>

<style>
  .buy-land-widget {
    min-width: 300px;
    min-height: 200px;
  }
</style> 