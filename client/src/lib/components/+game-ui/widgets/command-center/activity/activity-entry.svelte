<script lang="ts">
  import type { ActivityEvent } from '$lib/stores/activity.store.svelte';
  import { formatTimestampRelative } from '$lib/utils/date';
  import { selectLand } from '$lib/stores/camera.store';
  import { coordinatesToLocation, padAddress } from '$lib/utils';
  import { formatAddress } from '../../leaderboard/helpers';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import ChatableAddress from '$lib/components/ui/chatable-address.svelte';
  import ActivityChat from '$lib/components/ui/activity-chat.svelte';
  import { MessageCircle } from 'lucide-svelte';

  interface Props {
    event: ActivityEvent;
  }

  let { event }: Props = $props();

  let showChat = $state(false);

  const timestamp = $derived(formatTimestampRelative(event.timestamp));
  const location = $derived(coordinatesToLocation(event.location));

  // Generate a unique ID for this activity event
  const activityId = $derived(
    `${event.type}-${event.location.x}-${event.location.y}-${event.timestamp.getTime()}`,
  );

  function getDisplayName(address: string | undefined): string {
    if (!address) return '';
    const paddedAddr = padAddress(address);
    const username = paddedAddr
      ? usernamesStore.getUsername(paddedAddr)
      : undefined;
    if (username) {
      return `${username} (${formatAddress(address)})`;
    }
    return formatAddress(address);
  }

  const icon = $derived(
    event.type === 'nuke'
      ? '/ui/icons/Icon_Nuke.png'
      : event.type === 'auction_win'
        ? '/ui/icons/Icon_Thin_Auction.png'
        : '/ui/icons/Icon_Coin3.png',
  );

  const altText = $derived(
    event.type === 'nuke'
      ? 'Nuke'
      : event.type === 'auction_win'
        ? 'Auction'
        : 'Buy',
  );

  function handleClick() {
    selectLand(location, 2);
  }

  function toggleChat(e: MouseEvent) {
    e.stopPropagation();
    showChat = !showChat;
  }
</script>

<div class="relative">
  <div
    class="event-item flex items-center py-3 px-4 border-b border-gray-800/50 w-full text-left"
    onclick={handleClick}
    onkeydown={(e) => e.key === 'Enter' && handleClick()}
    role="button"
    tabindex="0"
  >
    <div class="h-full flex items-center justify-center self-center">
      <img src={icon} alt={altText} class="w-6 h-6 mr-2" />
    </div>
    <div class="flex flex-col flex-1">
      <div class="text-sm text-gray-500 mb-1 leading-none">
        {timestamp}
      </div>

      <div class="leading-none">
        {#if event.type === 'nuke'}
          {#if event.ownerNuked}
            <ChatableAddress address={event.ownerNuked}>
              <span class="text-gray-400"
                >{getDisplayName(event.ownerNuked)}</span
              >
            </ChatableAddress>
          {/if}
          <span class="text-gray-300">'s land at </span>
          <span class="text-blue-400">{event.locationString}</span>
          <span class="text-red-400"> was nuked</span>
        {:else if event.type === 'auction_win'}
          {#if event.buyer}
            <ChatableAddress address={event.buyer}>
              <span class="text-gray-400">{getDisplayName(event.buyer)}</span>
            </ChatableAddress>
          {/if}
          <span class="text-green-400"> won auction</span>
          <span class="text-gray-300"> at </span>
          <span class="text-blue-400">{event.locationString}</span>
          {#if event.price}
            <span class="text-gray-300"> for </span>
            <span class="text-yellow-400">{event.price.toString()}</span>
            {#if event.token}
              <img
                src={event.token.icon}
                alt={event.token.skin}
                class="w-4 h-4 inline-block ml-1"
              />
            {/if}
          {/if}
        {:else if event.type === 'land_buy'}
          {#if event.buyer}
            <ChatableAddress address={event.buyer}>
              <span class="text-gray-400">{getDisplayName(event.buyer)}</span>
            </ChatableAddress>
          {/if}
          <span class="text-gray-300"> bought </span>
          <span class="text-blue-400">{event.locationString}</span>
          {#if event.seller}
            <span class="text-gray-300"> from </span>
            <ChatableAddress address={event.seller}>
              <span class="text-gray-400">{getDisplayName(event.seller)}</span>
            </ChatableAddress>
          {/if}
          {#if event.price}
            <span class="text-gray-300"> for </span>
            <span class="text-yellow-400">{event.price.toString()}</span>
            {#if event.token}
              <img
                src={event.token.icon}
                alt={event.token.skin}
                class="w-4 h-4 inline-block ml-1"
              />
            {/if}
          {/if}
        {/if}
      </div>
    </div>

    <!-- Chat button -->
    <button
      onclick={toggleChat}
      class="ml-2 p-1.5 rounded hover:bg-gray-700/50 transition-colors"
      title="Comments"
    >
      <MessageCircle class="w-4 h-4 text-gray-400 hover:text-gray-200" />
    </button>
  </div>

  <!-- Chat popup -->
  {#if showChat}
    <div class="absolute left-0 right-0 top-full mt-1 z-50 px-2">
      <ActivityChat
        contextId={activityId}
        title="Comments"
        onClose={() => (showChat = false)}
      />
    </div>
  {/if}
</div>

<style>
  .event-item {
    transition: background-color 0.2s;
    cursor: pointer;
  }

  .event-item:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .event-item:focus {
    outline: 1px solid rgba(59, 130, 246, 0.5);
    background-color: rgba(255, 255, 255, 0.05);
  }
</style>
