<script lang="ts">
  import { messagesStore } from '$lib/stores/messages.store.svelte';
  import { Button } from '$lib/components/ui/button';

  let messageContent = $state('');
  let sending = $state(false);

  async function sendMessage() {
    if (
      !messageContent.trim() ||
      !messagesStore.activeConversation ||
      sending
    ) {
      return;
    }

    sending = true;
    const success = await messagesStore.sendMessage(
      messagesStore.activeConversation,
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

<div class="p-3 border-t border-border">
  <div class="flex gap-2">
    <textarea
      placeholder="Type a message..."
      bind:value={messageContent}
      onkeydown={handleKeyDown}
      disabled={sending}
      rows="1"
      class="flex-1 px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
    ></textarea>
    <Button
      onclick={sendMessage}
      disabled={!messageContent.trim() || sending}
      size="sm"
    >
      {sending ? '...' : 'Send'}
    </Button>
  </div>
  {#if messagesStore.error}
    <p class="text-xs text-destructive mt-1">{messagesStore.error}</p>
  {/if}
</div>
