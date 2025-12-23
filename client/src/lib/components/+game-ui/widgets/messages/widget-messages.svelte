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
  let showSuggestions = $state(false);
  let selectedSuggestionIndex = $state(-1);

  // Search for matching usernames
  let suggestions = $derived.by(() => {
    const input = newConversationAddress.trim();
    // Only search if input doesn't look like an address
    if (input.startsWith('0x')) return [];
    return usernamesStore.searchByUsername(input);
  });

  // Initialize store with user address
  $effect(() => {
    if (accountData.address) {
      messagesStore.setUserAddress(accountData.address);
    }
  });

  // Reset selection when suggestions change
  $effect(() => {
    if (suggestions.length > 0) {
      showSuggestions = true;
      selectedSuggestionIndex = -1;
    } else {
      showSuggestions = false;
    }
  });

  function startNewConversation() {
    const trimmed = newConversationAddress.trim();
    if (trimmed) {
      // Check if input is a username and get its address
      let addressToUse = trimmed;
      if (!trimmed.startsWith('0x')) {
        // It's a username, find the address
        const match = suggestions.find(
          (s) => s.username.toLowerCase() === trimmed.toLowerCase(),
        );
        if (match) {
          addressToUse = match.address;
        } else {
          return; // No matching username found
        }
      }

      // Normalize the address (pad to full length)
      const normalized = padAddress(addressToUse);
      if (normalized) {
        messagesStore.startConversation(normalized);
        newConversationAddress = '';
        showNewConversation = false;
        showSuggestions = false;
      }
    }
  }

  function selectSuggestion(suggestion: { address: string; username: string }) {
    newConversationAddress = suggestion.username;
    showSuggestions = false;
    // Start conversation immediately
    const normalized = padAddress(suggestion.address);
    if (normalized) {
      messagesStore.startConversation(normalized);
      newConversationAddress = '';
      showNewConversation = false;
    }
  }

  function getDisplayName(address: string | null): string {
    if (!address) return '';
    const username = usernamesStore.getUsername(address);
    return username || shortenHex(address, 6);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (showSuggestions && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        selectedSuggestionIndex = Math.min(
          selectedSuggestionIndex + 1,
          suggestions.length - 1,
        );
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          startNewConversation();
        }
      } else if (event.key === 'Escape') {
        showSuggestions = false;
      }
    } else if (event.key === 'Enter') {
      startNewConversation();
    }
  }

  function handleBlur() {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      showSuggestions = false;
    }, 150);
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
        <div class="p-3 border-b border-border flex gap-2 relative">
          <div class="flex-1 relative">
            <input
              type="text"
              placeholder="Enter wallet address or username"
              bind:value={newConversationAddress}
              onkeydown={handleKeyDown}
              onblur={handleBlur}
              onfocus={() => suggestions.length > 0 && (showSuggestions = true)}
              class="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {#if showSuggestions && suggestions.length > 0}
              <div
                class="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-50 overflow-hidden"
              >
                {#each suggestions as suggestion, index}
                  <button
                    type="button"
                    class={[
                      'w-full px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors flex items-center justify-between',
                      index === selectedSuggestionIndex && 'bg-accent/50',
                    ]}
                    onmousedown={() => selectSuggestion(suggestion)}
                  >
                    <span class="font-medium">{suggestion.username}</span>
                    <span class="text-xs text-muted-foreground font-mono">
                      {shortenHex(suggestion.address, 4)}
                    </span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>
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
