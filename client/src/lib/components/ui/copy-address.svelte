<script lang="ts">
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import RotatingCoin from '../loading-screen/rotating-coin.svelte';

  let {
    address,
    showUsername,
  }: {
    address: string;
    showUsername: boolean;
  } = $props();
  let showCopied = $state(false);

  let socialink = getSocialink();
  let username = $derived(
    showUsername && address ? socialink?.getUser(address) : null,
  );

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
    {#await username}
      <RotatingCoin />
    {:then info}
      {#if info?.exists}
        {info.username ?? formatAddress(address)}
      {:else}
        {formatAddress(address)}
      {/if}
    {:catch}
      {formatAddress(address)}
    {/await}
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
