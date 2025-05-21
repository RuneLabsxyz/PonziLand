<script lang="ts">
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import { padAddress } from '$lib/utils';

  let {
    address,
    showUsername,
  }: {
    address: string;
    showUsername: boolean;
  } = $props();
  let showCopied = $state(false);

  function formatAddress(address: string): string {
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

<span
  class="cursor-pointer hover:opacity-80 relative"
  onclick={() => copyToClipboard(address)}
  title={address || 'Unknown address'}
  role="button"
  tabindex="0"
  onkeydown={(e) => e.key === 'Enter' && copyToClipboard(address)}
>
  {#if showUsername && address}
    {usernamesStore.getUsernames()[padAddress(address)!] ||
      formatAddress(address)}
  {:else}
    {formatAddress(address)}
  {/if}

  {#if showCopied}
    <span
      class="absolute -top-6 left-0 bg-green-700 text-white px-2 py-1 rounded animate-fade-out"
    >
      Copied!
    </span>
  {/if}
</span>

<style>
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
