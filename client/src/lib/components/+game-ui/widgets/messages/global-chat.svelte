<script lang="ts">
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import accountData from '$lib/account.svelte';
  import { formatTimeOnly } from '$lib/utils/date';
  import { shortenHex, padAddress } from '$lib/utils';
  import { usernamesStore } from '$lib/stores/account.store.svelte';

  let scrollContainer: HTMLDivElement | undefined = $state();
  let messageContent = $state('');
  let sending = $state(false);

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    const messages = messagesStore.globalMessages;
    if (scrollContainer && messages.length > 0) {
      setTimeout(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 50);
    }
  });

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

  async function sendMessage() {
    if (!messageContent.trim() || sending) return;

    sending = true;
    const success = await messagesStore.sendGlobalMessage(
      messageContent.trim(),
    );
    if (success) {
      messageContent = '';
    }
    sending = false;
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }
</script>

<div class="flex flex-col h-full">
  <!-- Messages -->
  <div bind:this={scrollContainer} class="flex-1 overflow-y-auto p-3">
    {#if messagesStore.loading && messagesStore.globalMessages.length === 0}
      <div class="flex items-center justify-center h-full">
        <span class="text-muted-foreground">Loading messages...</span>
      </div>
    {:else if messagesStore.globalMessages.length === 0}
      <div class="flex items-center justify-center h-full">
        <span class="text-muted-foreground"
          >No messages yet. Start the conversation!</span
        >
      </div>
    {:else}
      <div class="flex flex-col gap-2">
        {#each messagesStore.globalMessages as message (message.id)}
          {@const isOwn = isOwnMessage(message.sender)}
          <div class={['flex', isOwn ? 'justify-end' : 'justify-start']}>
            <div
              class={[
                'max-w-[80%] rounded-lg px-3 py-2',
                isOwn
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-zinc-700 text-zinc-100',
              ]}
            >
              {#if !isOwn}
                <p class="text-xs font-medium text-zinc-300 mb-1">
                  {getDisplayName(message.sender)}
                </p>
              {/if}
              <p class="text-sm break-words whitespace-pre-wrap">
                {message.content}
              </p>
              <p
                class={[
                  'text-xs mt-1',
                  isOwn ? 'text-primary-foreground/70' : 'text-zinc-400',
                ]}
              >
                {formatTimeOnly(message.created_at)}
              </p>
            </div>
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
          placeholder="Type a message..."
          bind:value={messageContent}
          onkeydown={handleKeyDown}
          disabled={sending}
          class="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        />
        <button
          onclick={sendMessage}
          disabled={!messageContent.trim() || sending}
          class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  {:else}
    <div class="p-3 border-t border-border text-center">
      <span class="text-sm text-muted-foreground"
        >Connect wallet to send messages</span
      >
    </div>
  {/if}
</div>
