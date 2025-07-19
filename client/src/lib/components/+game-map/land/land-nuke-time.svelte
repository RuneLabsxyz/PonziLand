<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Card } from '$lib/components/ui/card';
  import { parseNukeTime, estimateNukeTime } from '$lib/utils/taxes';

  let {
    land,
  }: {
    land?: LandWithActions;
  } = $props();

  let nukeTime = $state<string | undefined>(undefined);

  $effect(() => {
    const calculateNukeTime = async () => {
      if (land === undefined) {
        nukeTime = undefined;
        return;
      }
      const timeInSeconds = await estimateNukeTime(land);
      nukeTime = parseNukeTime(timeInSeconds).toString();
    };
    calculateNukeTime();
  });

  function formatNukeTime(nukeTime: string | undefined) {
    if (land?.getNeighbors().getNeighbors().length == 0) return 'inf';
    return nukeTime === '' ? 'NUKABLE!' : nukeTime;
  }
</script>

<div class="flex items-center gap-2 text-ponzi-number text-red-500">
  <img src="/extra/nuke.png" alt="Nuke Symbol" class="h-6 w-6" />
  <span>{formatNukeTime(nukeTime)}</span>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
