<script lang="ts">
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
  import { shortenHex, padAddress } from '$lib/utils';
  import { formatTimestampRelative } from '$lib/utils/date';
  import { usernamesStore } from '$lib/stores/account.store.svelte';

  function selectConversation(address: string) {
    messagesStore.setActiveConversation(address);
  }

  function getDisplayName(address: string): string {
    // Normalize address for username lookup
    const normalized = padAddress(address);
    if (!normalized) return shortenHex(address, 6);
    const username = usernamesStore.getUsername(normalized);
    return username || shortenHex(address, 6);
  }
</script>

<ScrollArea class="h-full">
  {#if messagesStore.loading && messagesStore.conversations.length === 0}
    <div class="flex items-center justify-center p-8">
      <span class="text-muted-foreground">Loading...</span>
    </div>
  {:else if messagesStore.conversations.length === 0}
    <div class="flex flex-col items-center justify-center p-8 text-center">
      <p class="text-muted-foreground mb-2">No conversations yet</p>
      <p class="text-sm text-muted-foreground">
        Start a new conversation by clicking "+ New" above
      </p>
    </div>
  {:else}
    <div class="divide-y divide-border">
      {#each messagesStore.conversations as conversation}
        <button
          class="w-full p-3 text-left hover:bg-accent/50 transition-colors flex flex-col gap-1"
          onclick={() => selectConversation(conversation.with_address)}
        >
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">
              {getDisplayName(conversation.with_address)}
            </span>
            <span class="text-xs text-muted-foreground">
              {formatTimestampRelative(new Date(conversation.last_message_at))}
            </span>
          </div>
          <span class="text-sm text-muted-foreground truncate max-w-[200px]">
            {conversation.last_message}
          </span>
        </button>
      {/each}
    </div>
  {/if}
</ScrollArea>
