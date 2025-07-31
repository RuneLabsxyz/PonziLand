<script lang="ts">
  import { Copy, Check } from 'lucide-svelte';

  interface Props {
    address: string;
    class?: string;
    startChars?: number;
    endChars?: number;
  }

  let { address, class: className = '', startChars = 6, endChars = 4 }: Props = $props();

  let showTooltip = $state(false);
  let copied = $state(false);
  let tooltipRef: HTMLDivElement;

  const shortenedAddress = $derived(() => {
    if (!address) return '';
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  });

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  }
</script>

<div class="relative inline-flex">
  <button
    onclick={copyAddress}
    onmouseenter={() => showTooltip = true}
    onmouseleave={() => showTooltip = false}
    class="font-mono text-sm hover:text-purple-400 transition-colors cursor-pointer {className}"
  >
    {shortenedAddress()}
  </button>

  {#if showTooltip}
    <div
      bind:this={tooltipRef}
      class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap flex items-center gap-2"
    >
      <span class="font-mono">{address}</span>
      {#if copied}
        <Check class="w-3 h-3 text-green-400" />
      {:else}
        <Copy class="w-3 h-3 text-gray-400" />
      {/if}
      <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
    </div>
  {/if}
</div>