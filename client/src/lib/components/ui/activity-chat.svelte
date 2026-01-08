<script lang="ts">
  import {
    type Message,
    sendMessage,
    getContextMessages,
    ACTIVITY_CONTEXT_TYPE,
    GLOBAL_CHAT_ADDRESS,
  } from '$lib/api/messages';
  import accountData from '$lib/account.svelte';
  import { formatTimeOnly } from '$lib/utils/date';
  import { shortenHex, padAddress } from '$lib/utils';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import { MessageCircle, X, Send } from 'lucide-svelte';

  interface Props {
    contextId: string;
    title?: string;
    onClose?: () => void;
  }

  let { contextId, title = 'Comments', onClose }: Props = $props();

  let messages = $state<Message[]>([]);
  let messageContent = $state('');
  let loading = $state(true);
  let sending = $state(false);
  let scrollContainer: HTMLDivElement | undefined = $state();

  // Load messages on mount
  $effect(() => {
    loadMessages();
  });

  // Auto-scroll when messages change
  $effect(() => {
    if (scrollContainer && messages.length > 0) {
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 50);
    }
  });

  async function loadMessages() {
    loading = true;
    try {
      const result = await getContextMessages(
        ACTIVITY_CONTEXT_TYPE,
        contextId,
        undefined,
        50,
      );
      messages = result.reverse();
    } catch (err) {
      console.error('Failed to load activity messages:', err);
    } finally {
      loading = false;
    }
  }

  function isOwnMessage(senderAddress: string): boolean {
    if (!accountData.address) return false;
    return padAddress(senderAddress) === padAddress(accountData.address);
  }

  function getDisplayName(address: string): string {
    const normalized = padAddress(address);
    if (!normalized) return shortenHex(address, 6);
    const username = usernamesStore.getUsername(normalized);
    return username || shortenHex(address, 6);
  }

  async function handleSend() {
    if (!messageContent.trim() || sending || !accountData.address) return;

    sending = true;
    try {
      const result = await sendMessage(
        accountData.address,
        GLOBAL_CHAT_ADDRESS,
        messageContent.trim(),
        ACTIVITY_CONTEXT_TYPE,
        contextId,
      );

      // Add message to local state
      messages = [
        ...messages,
        {
          id: result.id,
          sender: accountData.address,
          content: messageContent.trim(),
          created_at: result.created_at,
        },
      ];
      messageContent = '';
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      sending = false;
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }
</script>

<div
  class="bg-background border border-border rounded-lg shadow-xl w-full max-h-96 flex flex-col overflow-hidden"
>
  <!-- Header -->
  <div
    class="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30"
  >
    <div class="flex items-center gap-2">
      <MessageCircle class="w-5 h-5 text-muted-foreground" />
      <span class="text-base font-medium">{title}</span>
    </div>
    {#if onClose}
      <button
        onclick={onClose}
        class="p-1.5 hover:bg-accent rounded transition-colors"
      >
        <X class="w-5 h-5" />
      </button>
    {/if}
  </div>

  <!-- Messages -->
  <div
    bind:this={scrollContainer}
    class="flex-1 overflow-y-auto p-3 min-h-[140px] max-h-[220px]"
  >
    {#if loading}
      <div class="flex items-center justify-center h-full">
        <span class="text-sm text-muted-foreground">Loading...</span>
      </div>
    {:else if messages.length === 0}
      <div class="flex items-center justify-center h-full">
        <span class="text-sm text-muted-foreground">No comments yet</span>
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each messages as message (message.id)}
          {@const isOwn = isOwnMessage(message.sender)}
          <div class={['flex flex-col', isOwn ? 'items-end' : 'items-start']}>
            {#if !isOwn}
              <span class="text-xs text-muted-foreground mb-0.5">
                {getDisplayName(message.sender)}
              </span>
            {/if}
            <div
              class={[
                'max-w-[90%] rounded px-3 py-1.5 text-sm',
                isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-zinc-700 text-zinc-100',
              ]}
            >
              {message.content}
            </div>
            <span class="text-[10px] text-muted-foreground mt-0.5">
              {formatTimeOnly(message.created_at)}
            </span>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Input -->
  {#if accountData.isConnected}
    <div class="p-3 border-t border-border">
      <div class="flex gap-2">
        <input
          type="text"
          placeholder="Add a comment..."
          bind:value={messageContent}
          onkeydown={handleKeyDown}
          disabled={sending}
          class="flex-1 px-3 py-2 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
        />
        <button
          onclick={handleSend}
          disabled={!messageContent.trim() || sending}
          class="p-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
    </div>
  {:else}
    <div class="p-3 border-t border-border text-center">
      <span class="text-xs text-muted-foreground"
        >Connect wallet to comment</span
      >
    </div>
  {/if}
</div>
