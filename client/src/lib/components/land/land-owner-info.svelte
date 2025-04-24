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
  let showCopied = $state(false);

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

  function copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        showCopied = true;
        setTimeout(() => {
          showCopied = false;
        }, 2000);
      })
      .catch((err) => console.error('Failed to copy text: ', err));
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
        <span
          class="cursor-pointer hover:opacity-80 relative"
          onclick={() => copyToClipboard(land?.owner || '')}
          title={land?.owner || 'Unknown address'}
          role="button"
          tabindex="0"
          onkeydown={(e) =>
            e.key === 'Enter' && copyToClipboard(land?.owner || '')}
        >
          {usernamesStore.getUsernames()[padAddress(land?.owner || '')!] ||
            formatAddress(land?.owner || '')}

          {#if showCopied}
            <span
              class="absolute -top-6 left-0 text-xs bg-green-700 text-white px-2 py-1 rounded animate-fade-out"
            >
              Copied!
            </span>
          {/if}
        </span>
      </div>
    </Card>
  {/if}
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }

  @keyframes fadeOut {
    0% {
      opacity: 1;
    }
    70% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }

  .animate-fade-out {
    animation: fadeOut 2s forwards;
  }
</style>
