<script lang="ts">
  import type { LandNukedHistoryEvent } from '$lib/api/history/index.svelte';
  import { formatTimestamp } from './utils';
  import { moveCameraToLocation, selectLand } from '$lib/stores/camera.store';
  import { coordinatesToLocation } from '$lib/utils';

  interface Props {
    event: LandNukedHistoryEvent;
  }

  let { event }: Props = $props();

  const timestamp = $derived(formatTimestamp(event.timestamp));
  const locationStr = $derived(
    `${event.landLocation.x}, ${event.landLocation.y}`,
  );
  const location = $derived(coordinatesToLocation(event.landLocation));

  function handleClick() {
    selectLand(location, 2);
  }
</script>

<button
  class="event-item flex items-start align-middle py-3 px-4 border-b border-gray-800/50 w-full text-left"
  onclick={handleClick}
>
  <div class="h-full flex items-center justify-center self-center">
    <img src="/ui/icons/Icon_Nuke.png" alt="Land Icon" class="w-6 h-6 mr-2" />
  </div>
  <div class="flex flex-col">
    <!-- Timestamp -->
    <div class="text-xs text-gray-500 mb-1">
      {timestamp}
    </div>

    <!-- Message -->
    <div class="text-sm">
      <span class="text-gray-300">Your land at </span>
      <span class="text-blue-400">{locationStr}</span>
      <span class="text-gray-300"> was </span>
      <span class="text-red-400">nuked</span>
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
