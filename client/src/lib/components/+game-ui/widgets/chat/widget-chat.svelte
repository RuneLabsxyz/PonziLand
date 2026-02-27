<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import accountData from '$lib/account.svelte';
  import { formatTimestampRelative } from '$lib/utils/date';
  import { Button } from '$lib/components/ui/button';
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
  import { formatAddress } from '../leaderboard/helpers';
  import {
    getDmMessages,
    getGlobalMessages,
    listDmChannels,
    sendDm,
    sendGlobalMessage,
    type ChatMessage,
    type DmChannel,
  } from './chat.service';

  type Props = {
    data?: Record<string, any>;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
    setCustomTitle?: (title: Snippet<[]> | null) => void;
  };

  let { setCustomControls = () => {}, setCustomTitle = () => {} }: Props =
    $props();

  let activeTab = $state<'global' | 'dms'>('global');
  let globalMessages = $state<ChatMessage[]>([]);
  let dmChannels = $state<DmChannel[]>([]);
  let dmMessages = $state<ChatMessage[]>([]);
  let selectedDmPeer = $state<string | null>(null);
  let draftMessage = $state('');
  let newDmRecipient = $state('');
  let showNewDmInput = $state(false);
  let isLoading = $state(false);
  let isSending = $state(false);
  let errorMessage = $state<string | null>(null);
  let scrollToken = $state(0);
  let bottomAnchor = $state<HTMLDivElement | null>(null);

  const hasWallet = $derived(Boolean(accountData.address));
  const canSend = $derived.by(() => {
    if (!hasWallet) {
      return false;
    }

    if (draftMessage.trim().length === 0) {
      return false;
    }

    if (activeTab === 'global') {
      return true;
    }

    return Boolean(selectedDmPeer);
  });

  const selectedDmChannel = $derived(
    dmChannels.find((channel) =>
      areSameAddress(channel.peer_address, selectedDmPeer),
    ) ?? null,
  );

  function areSameAddress(
    a: string | null | undefined,
    b: string | null | undefined,
  ): boolean {
    if (!a || !b) {
      return false;
    }

    return a.toLowerCase() === b.toLowerCase();
  }

  function sortMessages(messages: ChatMessage[]): ChatMessage[] {
    return [...messages].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  function sortDmChannels(channels: DmChannel[]): DmChannel[] {
    return [...channels].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }

  function hasNewMessages(
    current: ChatMessage[],
    incoming: ChatMessage[],
  ): boolean {
    if (incoming.length === 0) {
      return false;
    }

    if (incoming.length > current.length) {
      return true;
    }

    return incoming.at(-1)?.id !== current.at(-1)?.id;
  }

  function applyGlobalMessages(messages: ChatMessage[]) {
    const normalized = sortMessages(messages);
    const shouldScroll = hasNewMessages(globalMessages, normalized);
    globalMessages = normalized;

    if (shouldScroll) {
      scrollToken += 1;
    }
  }

  function applyDmMessages(messages: ChatMessage[]) {
    const normalized = sortMessages(messages);
    const shouldScroll = hasNewMessages(dmMessages, normalized);
    dmMessages = normalized;

    if (shouldScroll) {
      scrollToken += 1;
    }
  }

  function setError(error: unknown) {
    if (error instanceof Error) {
      errorMessage = error.message;
      return;
    }

    errorMessage = 'Unexpected chat error.';
  }

  function clearError() {
    errorMessage = null;
  }

  function formatSenderAddress(address: string): string {
    return formatAddress(address);
  }

  function formatMessageTime(createdAt: string): string {
    return formatTimestampRelative(new Date(createdAt));
  }

  function selectGlobalTab() {
    activeTab = 'global';
    showNewDmInput = false;
    clearError();
  }

  function selectDmTab() {
    activeTab = 'dms';
    clearError();
  }

  function goToDmList() {
    selectedDmPeer = null;
    dmMessages = [];
    draftMessage = '';
    clearError();
  }

  function openDmChannel(peerAddress: string) {
    selectedDmPeer = peerAddress.trim();
    dmMessages = [];
    draftMessage = '';
    clearError();
  }

  function toggleNewDmInput() {
    showNewDmInput = !showNewDmInput;

    if (!showNewDmInput) {
      newDmRecipient = '';
    }
  }

  function startDmConversation() {
    const senderAddress = accountData.address;
    const recipientAddress = newDmRecipient.trim();

    if (!senderAddress) {
      errorMessage = 'Connect wallet to start a DM.';
      return;
    }

    if (!recipientAddress) {
      errorMessage = 'Recipient address is required.';
      return;
    }

    if (areSameAddress(senderAddress, recipientAddress)) {
      errorMessage = 'You cannot DM your own address.';
      return;
    }

    clearError();
    showNewDmInput = false;
    newDmRecipient = '';
    openDmChannel(recipientAddress);
  }

  async function sendMessage() {
    const senderAddress = accountData.address;
    const content = draftMessage.trim();

    if (!senderAddress || !content) {
      return;
    }

    if (activeTab === 'dms' && !selectedDmPeer) {
      errorMessage = 'Select a DM conversation first.';
      return;
    }

    clearError();
    isSending = true;

    try {
      if (activeTab === 'global') {
        const message = await sendGlobalMessage(senderAddress, content);
        applyGlobalMessages([...globalMessages, message]);
      } else if (selectedDmPeer) {
        const message = await sendDm(senderAddress, selectedDmPeer, content);
        applyDmMessages([...dmMessages, message]);

        try {
          dmChannels = sortDmChannels(await listDmChannels(senderAddress));
        } catch {}
      }

      draftMessage = '';
    } catch (error) {
      setError(error);
    } finally {
      isSending = false;
    }
  }

  function handleMessageInputKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  function handleDmRecipientKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      startDmConversation();
    }
  }

  $effect(() => {
    setCustomControls(null);
    setCustomTitle(null);
  });

  $effect(() => {
    const tab = activeTab;
    const userAddress = accountData.address;
    const peerAddress = selectedDmPeer;
    let disposed = false;

    const fetchActiveData = async (showSpinner: boolean) => {
      if (showSpinner) {
        isLoading = true;
      }

      try {
        if (tab === 'global') {
          const messages = await getGlobalMessages();
          if (!disposed) {
            applyGlobalMessages(messages);
          }
          return;
        }

        if (!userAddress) {
          if (!disposed) {
            dmChannels = [];
            dmMessages = [];
          }
          return;
        }

        if (peerAddress) {
          const messages = await getDmMessages(userAddress, peerAddress);
          if (!disposed) {
            applyDmMessages(messages);
          }
        } else {
          const channels = await listDmChannels(userAddress);
          if (!disposed) {
            dmChannels = sortDmChannels(channels);
          }
        }
      } catch (error) {
        if (!disposed) {
          setError(error);
        }
      } finally {
        if (showSpinner && !disposed) {
          isLoading = false;
        }
      }
    };

    void fetchActiveData(true);

    const intervalId = setInterval(() => {
      void fetchActiveData(false);
    }, 5000);

    return () => {
      disposed = true;
      clearInterval(intervalId);
    };
  });

  $effect(() => {
    scrollToken;

    if (!bottomAnchor) {
      return;
    }

    void tick().then(() => {
      bottomAnchor?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  });
</script>

<div class="h-full w-full flex flex-col bg-black/50 text-white">
  <div class="flex border-b border-yellow-500/30">
    <button
      class={[
        'flex-1 px-3 py-2 text-sm font-semibold transition-colors',
        activeTab === 'global'
          ? 'bg-yellow-500/20 text-yellow-300'
          : 'bg-black/40 text-gray-300 hover:text-white',
      ]}
      onclick={selectGlobalTab}
      type="button"
    >
      Global
    </button>
    <button
      class={[
        'flex-1 px-3 py-2 text-sm font-semibold transition-colors',
        activeTab === 'dms'
          ? 'bg-yellow-500/20 text-yellow-300'
          : 'bg-black/40 text-gray-300 hover:text-white',
      ]}
      onclick={selectDmTab}
      type="button"
    >
      DMs
    </button>
  </div>

  {#if errorMessage}
    <div
      class="mx-2 mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200"
    >
      {errorMessage}
    </div>
  {/if}

  {#if activeTab === 'global'}
    <div class="flex-1 min-h-0 flex flex-col">
      <ScrollArea class="flex-1 min-h-0 px-2 py-2" orientation="vertical">
        <div class="flex flex-col gap-2 pb-2">
          {#if isLoading && globalMessages.length === 0}
            <p class="px-2 py-4 text-center text-sm text-gray-400">
              Loading global chat...
            </p>
          {:else if globalMessages.length === 0}
            <p class="px-2 py-4 text-center text-sm text-gray-400">
              No messages yet. Be the first to post.
            </p>
          {:else}
            {#each globalMessages as message (message.id)}
              {@const isOwnMessage = areSameAddress(
                message.sender_address,
                accountData.address,
              )}
              <div
                class={[
                  'rounded-md border px-3 py-2',
                  isOwnMessage
                    ? 'ml-8 border-yellow-500/40 bg-yellow-500/10'
                    : 'mr-8 border-gray-700/80 bg-black/40',
                ]}
              >
                <div class="flex items-center justify-between gap-2 text-xs">
                  <span class="font-mono text-yellow-300"
                    >{formatSenderAddress(message.sender_address)}</span
                  >
                  <span class="text-gray-500"
                    >{formatMessageTime(message.created_at)}</span
                  >
                </div>
                <p
                  class="mt-1 whitespace-pre-wrap break-words text-sm text-white"
                >
                  {message.content}
                </p>
              </div>
            {/each}
          {/if}
          <div bind:this={bottomAnchor}></div>
        </div>
      </ScrollArea>

      <div class="border-t border-yellow-500/20 p-2">
        <div class="flex items-center gap-2">
          <input
            type="text"
            bind:value={draftMessage}
            onkeydown={handleMessageInputKeydown}
            placeholder={hasWallet
              ? 'Say something in global chat...'
              : 'Connect wallet to send messages'}
            disabled={!hasWallet || isSending}
            class="flex-1 rounded-md border border-yellow-500/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-yellow-400/60 focus:outline-none"
          />
          <Button
            size="md"
            onclick={sendMessage}
            disabled={!canSend || isSending}
          >
            {isSending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  {:else}
    <div class="flex-1 min-h-0 flex flex-col">
      {#if !hasWallet}
        <div
          class="flex h-full items-center justify-center px-6 text-center text-sm text-gray-400"
        >
          Connect your wallet to access DMs.
        </div>
      {:else if selectedDmPeer}
        <div
          class="flex items-center justify-between gap-2 border-b border-yellow-500/20 px-2 py-2"
        >
          <button
            type="button"
            onclick={goToDmList}
            class="rounded-md border border-yellow-500/30 bg-black/40 px-2 py-1 text-xs text-yellow-300 hover:bg-yellow-500/10"
          >
            Back
          </button>
          <div class="min-w-0 text-right">
            <p class="truncate font-mono text-xs text-yellow-300">
              {formatSenderAddress(selectedDmPeer)}
            </p>
            <p class="text-[11px] text-gray-500">
              {selectedDmChannel
                ? `Channel opened ${formatMessageTime(selectedDmChannel.created_at)}`
                : 'New conversation'}
            </p>
          </div>
        </div>

        <ScrollArea class="flex-1 min-h-0 px-2 py-2" orientation="vertical">
          <div class="flex flex-col gap-2 pb-2">
            {#if isLoading && dmMessages.length === 0}
              <p class="px-2 py-4 text-center text-sm text-gray-400">
                Loading DM messages...
              </p>
            {:else if dmMessages.length === 0}
              <p class="px-2 py-4 text-center text-sm text-gray-400">
                No DM messages yet. Say hello.
              </p>
            {:else}
              {#each dmMessages as message (message.id)}
                {@const isOwnMessage = areSameAddress(
                  message.sender_address,
                  accountData.address,
                )}
                <div
                  class={[
                    'rounded-md border px-3 py-2',
                    isOwnMessage
                      ? 'ml-8 border-yellow-500/40 bg-yellow-500/10'
                      : 'mr-8 border-gray-700/80 bg-black/40',
                  ]}
                >
                  <div class="flex items-center justify-between gap-2 text-xs">
                    <span class="font-mono text-yellow-300"
                      >{formatSenderAddress(message.sender_address)}</span
                    >
                    <span class="text-gray-500"
                      >{formatMessageTime(message.created_at)}</span
                    >
                  </div>
                  <p
                    class="mt-1 whitespace-pre-wrap break-words text-sm text-white"
                  >
                    {message.content}
                  </p>
                </div>
              {/each}
            {/if}
            <div bind:this={bottomAnchor}></div>
          </div>
        </ScrollArea>

        <div class="border-t border-yellow-500/20 p-2">
          <div class="flex items-center gap-2">
            <input
              type="text"
              bind:value={draftMessage}
              onkeydown={handleMessageInputKeydown}
              placeholder="Type a direct message..."
              disabled={isSending}
              class="flex-1 rounded-md border border-yellow-500/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-yellow-400/60 focus:outline-none"
            />
            <Button
              size="md"
              onclick={sendMessage}
              disabled={!canSend || isSending}
            >
              {isSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
        </div>
      {:else}
        <div
          class="flex items-center justify-between border-b border-yellow-500/20 px-2 py-2"
        >
          <p class="text-sm font-semibold text-yellow-300">Direct Messages</p>
          <Button size="md" onclick={toggleNewDmInput}>New DM</Button>
        </div>

        {#if showNewDmInput}
          <div class="border-b border-yellow-500/20 p-2">
            <div class="flex items-center gap-2">
              <input
                type="text"
                bind:value={newDmRecipient}
                onkeydown={handleDmRecipientKeydown}
                placeholder="Recipient wallet address"
                class="flex-1 rounded-md border border-yellow-500/20 bg-black/60 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-yellow-400/60 focus:outline-none"
              />
              <Button
                size="md"
                onclick={startDmConversation}
                disabled={newDmRecipient.trim().length === 0}
              >
                Open
              </Button>
            </div>
          </div>
        {/if}

        <ScrollArea class="flex-1 min-h-0 px-2 py-2" orientation="vertical">
          <div class="flex flex-col gap-2">
            {#if isLoading && dmChannels.length === 0}
              <p class="px-2 py-4 text-center text-sm text-gray-400">
                Loading DM channels...
              </p>
            {:else if dmChannels.length === 0}
              <p class="px-2 py-4 text-center text-sm text-gray-400">
                No DM channels yet. Start a new conversation.
              </p>
            {:else}
              {#each dmChannels as channel}
                <button
                  type="button"
                  onclick={() => openDmChannel(channel.peer_address)}
                  class="w-full rounded-md border border-yellow-500/20 bg-black/40 px-3 py-2 text-left transition-colors hover:border-yellow-400/40 hover:bg-yellow-500/10"
                >
                  <p class="font-mono text-xs text-yellow-300">
                    {formatSenderAddress(channel.peer_address)}
                  </p>
                  <p class="mt-1 text-[11px] text-gray-500">
                    Active {formatMessageTime(channel.created_at)}
                  </p>
                </button>
              {/each}
            {/if}
          </div>
        </ScrollArea>
      {/if}
    </div>
  {/if}
</div>
