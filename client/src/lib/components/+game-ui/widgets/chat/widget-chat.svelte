<script lang="ts">
  import { onMount } from 'svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { generateMessageTypedData } from './helpers';
  const { client: sdk } = useDojo();
  // State for the chat
  let messages: {
    id: number;
    text: string;
    sender: string;
    timestamp: Date;
  }[] = $state([]);
  let newMessage = $state('');
  let chatContainer: HTMLElement | undefined;
  // Function to handle sending a new message
  async function sendMessage() {
    if (newMessage.trim() === '') return;

    messages = [
      ...messages,
      {
        id: Date.now(),
        text: newMessage,
        sender: 'user',
        timestamp: new Date(),
      },
    ];

    newMessage = '';
    const provider = useAccount()?.getProvider();
    const account = provider?.getWalletAccount();
    if (!account) {
      return;
    }
    const data = generateMessageTypedData(
      account.address,
      'chat',
      newMessage,
      Date.now().toString(),
    );
    const signature = await account?.signMessage(data);
    sdk.toriiClient.publishMessage(JSON.stringify(data), signature as string[]);

    // Scroll to bottom after message is added
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 0);
  }
  // Handle Enter key to send message
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  onMount(() => {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  });
</script>

<div
  class="flex flex-col h-full bg-gray-800 rounded-lg overflow-hidden shadow-lg"
>
  <div class="px-4 py-3 bg-gray-700 border-b border-gray-600">
    <h3 class="m-0 text-white text-base font-medium">Chat</h3>
  </div>

  <div
    bind:this={chatContainer}
    class="flex-1 overflow-y-auto p-4 flex flex-col gap-2"
  >
    {#if messages.length === 0}
      <div class="text-gray-400 text-center my-auto italic">
        No messages yet. Start chatting!
      </div>
    {:else}
      {#each messages as message (message.id)}
        <div
          class={`max-w-[80%] p-2 rounded-xl break-words ${message.sender === 'user' ? 'self-end bg-blue-500 text-white' : 'self-start bg-gray-600 text-white'}`}
        >
          <div>{message.text}</div>
          <div class="text-xs mt-1 opacity-80 text-right">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <div class="flex p-3 bg-gray-700 border-t border-gray-600 gap-2">
    <textarea
      bind:value={newMessage}
      onkeydown={handleKeydown}
      placeholder="Type a message..."
      rows="1"
      class="flex-1 px-3 py-2 rounded-full border-none bg-gray-800 text-white resize-none outline-none font-inherit"
    ></textarea>
    <button
      onclick={sendMessage}
      disabled={!newMessage.trim()}
      class="px-4 py-2 bg-blue-500 text-white border-none rounded-full font-bold cursor-pointer transition-colors duration-200 hover:bg-blue-400 disabled:bg-gray-600 disabled:opacity-70 disabled:cursor-not-allowed"
    >
      Send
    </button>
  </div>
</div>
