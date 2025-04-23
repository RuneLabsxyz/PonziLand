<script lang="ts">
  import { Card } from '../ui/card';
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import { AI_AGENT_ADDRESS } from '$lib/const';

  let {
    land,
  }: {
    land?: SelectedLand;
  } = $props();

  let isAiAgent = $state(false);

  $effect(() => {
    if (AI_AGENT_ADDRESS == land?.owner) {
      isAiAgent = true;
    } else {
      isAiAgent = false;
    }
  });
</script>

<div class="absolute left-0 -translate-y-12">
  {#if isAiAgent}
    <div class="-translate-x-6 translate-y-2">
      <img src="/extra/ai.png" alt="" />
    </div>
  {:else}
    <Card>
      <div class="flex items-center gap-2 text-ponzi-number">
        <span>{land?.owner?.slice(0, 4) + '...' + land?.owner?.slice(-4)}</span>
      </div>
    </Card>
  {/if}
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
