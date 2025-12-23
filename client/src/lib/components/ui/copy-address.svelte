<script lang="ts">
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { FUSE_DISABLE_SOCIALINK } from '$lib/flags';
  import RotatingCoin from '../loading-screen/rotating-coin.svelte';
  import { MessageCircle } from 'lucide-svelte';
  import { padAddress } from '$lib/utils';

  let {
    address,
    showUsername,
    showChatButton = true,
  }: {
    address: string;
    showUsername: boolean;
    showChatButton?: boolean;
  } = $props();
  let showCopied = $state(false);
  let isHovering = $state(false);

  let socialink = getSocialink();
  let username = $derived(
    showUsername && address
      ? FUSE_DISABLE_SOCIALINK
        ? null // Don't use socialink when disabled, fall back to account store
        : socialink?.getUser(address)
      : null,
  );

  // Fallback username from account store when socialink is disabled
  let fallbackUsername = $derived(
    FUSE_DISABLE_SOCIALINK && showUsername && address
      ? usernamesStore.getUsername(address)
      : undefined,
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

  function startChat(e: MouseEvent) {
    e.stopPropagation();
    const normalized = padAddress(address);
    if (normalized) {
      messagesStore.setActiveTab('direct');
      messagesStore.startConversation(normalized);
      // Open the messages widget
      widgetsStore.updateWidget('messages', {
        isOpen: true,
        isMinimized: false,
      });
    }
  }
</script>

<span
  class="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 relative"
  onmouseenter={() => (isHovering = true)}
  onmouseleave={() => (isHovering = false)}
  role="group"
>
  <span
    onclick={() => copyToClipboard(address)}
    title={address || 'Unknown address'}
    role="button"
    tabindex="0"
    onkeydown={(e) => e.key === 'Enter' && copyToClipboard(address)}
  >
    {#if showUsername && address}
      {#if FUSE_DISABLE_SOCIALINK}
        <!-- Use fallback username from account store when socialink is disabled -->
        {fallbackUsername ?? formatAddress(address)}
      {:else}
        <!-- Use socialink when enabled -->
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
      {/if}
    {:else}
      {formatAddress(address)}
    {/if}
  </span>

  {#if showChatButton && isHovering}
    <button
      onclick={startChat}
      class="inline-flex items-center justify-center p-1 rounded bg-primary/90 hover:bg-primary text-primary-foreground transition-all"
      title="Chat"
    >
      <MessageCircle class="w-3 h-3" />
    </button>
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
