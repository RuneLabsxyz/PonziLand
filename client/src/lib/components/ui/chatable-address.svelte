<script lang="ts">
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { padAddress, shortenHex } from '$lib/utils';
  import { MessageCircle } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  interface Props {
    address: string;
    children?: Snippet;
    showChatOnHover?: boolean;
    class?: string;
  }

  let {
    address,
    children,
    showChatOnHover = true,
    class: className = '',
  }: Props = $props();

  let isHovering = $state(false);

  function getDisplayName(): string {
    const normalized = padAddress(address);
    if (!normalized) return shortenHex(address, 6);
    const username = usernamesStore.getUsername(normalized);
    return username || shortenHex(address, 6);
  }

  function startChat(e: MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
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
  class="inline-flex items-center gap-1 relative {className}"
  onmouseenter={() => (isHovering = true)}
  onmouseleave={() => (isHovering = false)}
  role="group"
>
  {#if children}
    {@render children()}
  {:else}
    <span>{getDisplayName()}</span>
  {/if}

  {#if showChatOnHover && isHovering}
    <button
      onclick={startChat}
      class="inline-flex items-center justify-center p-1 rounded bg-primary/90 hover:bg-primary text-primary-foreground transition-all text-xs"
      title="Chat with {getDisplayName()}"
    >
      <MessageCircle class="w-3 h-3" />
    </button>
  {/if}
</span>
