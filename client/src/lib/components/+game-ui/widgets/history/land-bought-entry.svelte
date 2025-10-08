<script lang="ts">
  import type { LandBoughtHistoryEvent } from '$lib/api/history/index.svelte';
  import { formatTimestamp } from './utils';
  import { moveCameraToLocation, selectLand } from '$lib/stores/camera.store';
  import { coordinatesToLocation } from '$lib/utils';
  import { selectedLand } from '$lib/stores/store.svelte';
  import { formatAddress } from '../leaderboard/helpers';

  interface Props {
    event: LandBoughtHistoryEvent;
  }

  let { event }: Props = $props();

  const timestamp = $derived(formatTimestamp(event.timestamp));
  const isSale = $derived(event.isSale);
  const amount = $derived(event.amount.toString());
  const symbol = $derived(event.amount.getToken()!.symbol);
  const locationStr = $derived(
    `${event.landLocation.x}, ${event.landLocation.y}`,
  );
  const location = $derived(coordinatesToLocation(event.landLocation));

  function handleClick() {
    selectLand(location, 2);
  }
</script>

<button
  class="event-item flex flex-col py-3 px-4 border-b border-gray-800/50 w-full text-left"
  onclick={handleClick}
>
  <div class="flex items-start">
    <div>
      <img
        src="/ui/icons/Icon_Coin3.png"
        alt="Land Icon"
        class="w-6 h-6 mr-2"
      />
    </div>
    <div>
      <!-- Timestamp -->
      <div class="text-xs text-gray-500 mb-1">
        {timestamp}
      </div>

      <!-- Message -->
      <div class="text-sm">
        {#if isSale}
          <!-- User sold a land - they received money -->
          <span class="text-gray-400">{formatAddress(event.buyer)}</span>
          <span class="text-gray-300">bought your land at </span>
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
      </div>
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
