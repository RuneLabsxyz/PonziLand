<script lang="ts">
  import { Card } from '../ui/card';
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import { AI_AGENT_ADDRESS } from '$lib/const';
  import { usernamesStore } from '$lib/stores/account.svelte';
  import { padAddress } from '$lib/utils';

  let {
    land,
    isOwner,
  }: {
    land?: SelectedLand;
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

  export function formatAddress(address: string): string {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }
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
        <span>
          {usernamesStore.getUsernames()[padAddress(land?.owner || '')!] ||
            formatAddress(land?.owner || '')}
        </span>
      </div>
    </Card>
  {/if}
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }
</style>
