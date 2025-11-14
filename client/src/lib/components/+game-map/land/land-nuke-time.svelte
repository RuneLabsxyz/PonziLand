<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { tutorialAttribute } from '$lib/components/tutorial/stores.svelte';
  import { Card } from '$lib/components/ui/card';
  import { parseNukeTime, estimateNukeTimeRpc } from '$lib/utils/taxes';

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

      const timeInSeconds = await estimateNukeTimeRpc(land);
      nukeTime = parseNukeTime(timeInSeconds).toString();
    };
    calculateNukeTime();
  });

  function formatNukeTime(nukeTime: string | undefined) {
    if (land?.getNeighbors().getBaseLandsArray().length == 0) return 'inf';
    return nukeTime === '' ? 'NUKABLE!' : nukeTime;
  }
</script>

<div
  class={[
    'flex items-center gap-2 text-ponzi-number text-red-500',
    tutorialAttribute('highlight_info_nuke').has
      ? 'ring-2 ring-blue-400 ring-opacity-50 bg-blue-50 bg-opacity-10 rounded-lg p-2'
      : '',
  ]}
>
  <img src="/extra/nuke.png" alt="Nuke Symbol" class="h-6 w-6" />
  <span>{formatNukeTime(nukeTime)}</span>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
