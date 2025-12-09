<script lang="ts">
  import type {
    LandNukedHistoryEvent,
    LandBoughtHistoryEvent,
  } from '$lib/api/history/index.svelte';
  import { formatTimestamp, formatTimestampRelative } from '$lib/utils/date';
  import { moveCameraToLocation, selectLand } from '$lib/stores/camera.store';
  import { coordinatesToLocation } from '$lib/utils';
  import { formatAddress } from '../leaderboard/helpers';

  interface Props {
    event: LandNukedHistoryEvent | LandBoughtHistoryEvent;
  }

  let { event }: Props = $props();

  // Type guards
  const isNukedEvent = (
    e: LandNukedHistoryEvent | LandBoughtHistoryEvent,
  ): e is LandNukedHistoryEvent => 'type' in e && e.type === 'LandNukedEvent';

  const isBoughtEvent = (
    e: LandNukedHistoryEvent | LandBoughtHistoryEvent,
  ): e is LandBoughtHistoryEvent => 'type' in e && e.type === 'LandBoughtEvent';

  // Common derived values
  const timestamp = $derived(formatTimestampRelative(event.timestamp));
  const locationStr = $derived(
    `${event.landLocation.x}, ${event.landLocation.y}`,
  );
  const location = $derived(coordinatesToLocation(event.landLocation));

  // Event-specific derived values
  const eventType = $derived(event.type);
  const icon = $derived(
    isNukedEvent(event)
      ? '/ui/icons/Icon_Nuke.png'
      : '/ui/icons/Icon_Coin3.png',
  );
  const altText = $derived(isNukedEvent(event) ? 'Nuke Icon' : 'Coin Icon');

  // For bought events
  const isSale = $derived(isBoughtEvent(event) ? event.isSale : false);
  const amount = $derived(
    isBoughtEvent(event) ? event.amount.toString() : null,
  );
  const symbol = $derived(
    isBoughtEvent(event) ? event.amount.getToken()?.symbol : null,
  );
  const buyer = $derived(isBoughtEvent(event) ? event.buyer : null);

  function handleClick() {
    selectLand(location, 2);
  }
</script>

<button
  class="event-item flex items-center py-3 px-4 border-b border-gray-800/50 w-full text-left"
  onclick={handleClick}
>
  <div class="h-full flex items-center justify-center self-center">
    <img src={icon} alt={altText} class="w-6 h-6 mr-2" />
  </div>
  <div class="flex flex-col">
    <!-- Timestamp -->
    <div class="text-sm text-gray-500 mb-1 leading-none">
      {timestamp}
    </div>

    <!-- Message -->
    <div class="leading-none">
      {#if isNukedEvent(event)}
        <!-- Nuked event -->
        <span class="text-gray-300">Your land at </span>
        <span class="text-blue-400">{locationStr}</span>
        <span class="text-gray-300"> was </span>
        <span class="text-red-400">nuked</span>
      {:else if isBoughtEvent(event)}
        <!-- Bought event -->
        {#if isSale}
          <!-- User sold a land - they received money -->
          <span class="text-gray-400">{formatAddress(buyer!)}</span>
          <span class="text-gray-300"> bought your land at </span>
          <span class="text-blue-400">{locationStr}</span>
          <span class="text-gray-300"> for </span>
          <span class="text-yellow-400">{amount}</span>
          <span class="text-gray-300"> {symbol}</span>
        {:else}
          <!-- User bought a land -->
          <span class="text-gray-300">You </span>
          <span class="text-blue-400"
            >bought land at {locationStr} for {amount}</span
          >
          <span class="text-gray-300"> ({symbol})</span>
        {/if}
      {/if}
    </div>
  </div>
</button>

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
