<script lang="ts">
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import accountData from '$lib/account.svelte';
  import ConversationList from './conversation-list.svelte';
  import MessageThread from './message-thread.svelte';
  import MessageInput from './message-input.svelte';
  import { Button } from '$lib/components/ui/button';
  import { shortenHex, padAddress } from '$lib/utils';
  import { usernamesStore } from '$lib/stores/account.store.svelte';

  let newConversationAddress = $state('');
  let showNewConversation = $state(false);

  // Initialize store with user address
  $effect(() => {
    if (accountData.address) {
      messagesStore.setUserAddress(accountData.address);
    }
  });

  function startNewConversation() {
    const trimmed = newConversationAddress.trim();
    if (trimmed) {
      // Normalize the address (pad to full length)
      const normalized = padAddress(trimmed);
      if (normalized) {
        messagesStore.startConversation(normalized);
        newConversationAddress = '';
        showNewConversation = false;
      }
    }
  }

  function getDisplayName(address: string | null): string {
    if (!address) return '';
    const username = usernamesStore.getUsername(address);
    return username || shortenHex(address, 6);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      startNewConversation();
    }
  }
</script>

<div class="w-full h-full flex flex-col">
  {#if !accountData.isConnected}
    <div class="flex items-center justify-center h-full">
      <p class="text-muted-foreground">Connect your wallet to use messages</p>
    </div>
  {:else if messagesStore.activeConversation}
    <!-- Active conversation view -->
    <div class="flex flex-col h-full">
      <!-- Header -->
      <div class="flex items-center gap-2 p-3 border-b border-border">
        <button
          class="text-sm hover:underline"
          onclick={() => messagesStore.setActiveConversation(null)}
        >
          ← Back
        </button>
        <span class="font-mono text-sm">
          {getDisplayName(messagesStore.activeConversation)}
        </span>
      </div>

      <!-- Messages -->
      <div class="flex-1 overflow-hidden">
        <MessageThread />
      </div>

      <!-- Input -->
      <MessageInput />
    </div>
  {:else}
    <!-- Conversation list view -->
    <div class="flex flex-col h-full">
      <!-- Header with new conversation button -->
      <div class="flex items-center justify-between p-3 border-b border-border">
        <span class="font-semibold">Messages</span>
        <button
          class="text-sm px-2 py-1 border border-border rounded hover:bg-accent/50 transition-colors"
          onclick={() => (showNewConversation = !showNewConversation)}
        >
          {showNewConversation ? 'Cancel' : '+ New'}
        </button>
      </div>

      <!-- New conversation input -->
      {#if showNewConversation}
        <div class="p-3 border-b border-border flex gap-2">
          <input
            type="text"
            placeholder="Enter wallet address (0x...)"
            bind:value={newConversationAddress}
            onkeydown={handleKeyDown}
            class="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button size="sm" onclick={startNewConversation}>Start</Button>
        </div>
      {/if}

      <!-- Conversation list -->
      <div class="flex-1 overflow-hidden">
        <ConversationList />
      </div>

      {#if messagesStore.error}
        <div
          class="p-2 text-sm text-destructive bg-destructive/10 border-t border-destructive/20"
        >
          {messagesStore.error}
        </div>
      {/if}
    </div>
  {/if}
</div>
