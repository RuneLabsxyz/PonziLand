<script lang="ts">
  import { Card } from '../ui/card';
  import { parseNukeTime, estimateNukeTime } from '$lib/utils/taxes';
  import type { SelectedLand } from '$lib/stores/stores.svelte';

  let {
    land,
  }: {
    land?: SelectedLand;
  } = $props();

  let nukeTime: string | undefined = $derived(calculateNukeTime());

  function calculateNukeTime(): string | undefined {
    if (land == undefined) return;
    return parseNukeTime(
      estimateNukeTime(
        land.sellPrice.rawValue().toNumber(),
        land.stakeAmount.rawValue().toNumber(),
        land.getNeighbors().getNeighbors().length,
        Number(land.last_pay_time),
      ),
    ).toString();
  }

  function formatNukeTime(nukeTime: string | undefined) {
    return nukeTime === '' ? 'NUKABLE!' : nukeTime;
  }
</script>

<div class="absolute right-0 -translate-y-12">
  <Card>
    <div class="flex items-center gap-2 text-ponzi-number text-red-500">
      <img src="/extra/nuke.png" alt="Nuke Shield" class="h-6 w-6" />
      <span>{formatNukeTime(nukeTime)}</span>
    </div>
  </Card>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
