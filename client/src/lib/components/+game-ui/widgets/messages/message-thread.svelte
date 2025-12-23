<script lang="ts">
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import accountData from '$lib/account.svelte';
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
  import { formatTimeOnly } from '$lib/utils/date';
  import { padAddress } from '$lib/utils';

  let scrollContainer: HTMLDivElement | undefined = $state();

  // Auto-scroll to bottom when new messages arrive
  $effect(() => {
    const messages = messagesStore.activeMessages;
    if (scrollContainer && messages.length > 0) {
      // Small delay to ensure DOM has updated
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
</script>

<div bind:this={scrollContainer} class="h-full overflow-y-auto p-3">
  {#if messagesStore.loading && messagesStore.activeMessages.length === 0}
    <div class="flex items-center justify-center h-full">
      <span class="text-muted-foreground">Loading messages...</span>
    </div>
  {:else if messagesStore.activeMessages.length === 0}
    <div class="flex items-center justify-center h-full">
      <span class="text-muted-foreground">No messages yet. Say hello!</span>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      {#each messagesStore.activeMessages as message (message.id)}
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
