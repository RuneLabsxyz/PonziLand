<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import CopyAddress from '$lib/components/ui/copy-address.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import { AI_AGENT_ADDRESS } from '$lib/const';

  let {
    land,
    isOwner,
  }: {
    land?: LandWithActions;
    isOwner: boolean;
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
  {#if isOwner}
    <div class="-translate-x-6 translate-y-2">
      <img
        src="/ui/icons/Icon_Crown.png"
        alt="owner"
        style="transform: rotate(-30deg); width: 50px"
      />
    </div>
  {:else if isAiAgent}
    <div class="-translate-x-6 translate-y-2">
      <img src="/extra/ai.png" alt="" />
    </div>
  {:else}
    <Card>
      <div class="flex items-center gap-2 text-ponzi-number">
        <CopyAddress address={land?.owner || ''} showUsername={true} />
      </div>
    </Card>
  {/if}
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
