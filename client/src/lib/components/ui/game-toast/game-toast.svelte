<script lang="ts">
  import type { ActivityEvent } from '$lib/stores/activity.store.svelte';
  import { activityStore } from '$lib/stores/activity.store.svelte';
  import { selectLand } from '$lib/stores/camera.store';
  import { coordinatesToLocation, padAddress } from '$lib/utils';
  import { formatAddress } from '$lib/components/+game-ui/widgets/leaderboard/helpers';
  import { usernamesStore } from '$lib/stores/account.store.svelte';

  interface Props {
    event: ActivityEvent;
  }

  let { event }: Props = $props();

  const location = $derived(coordinatesToLocation(event.location));

  const icon = $derived(
    event.type === 'nuke'
      ? '/ui/icons/Icon_Nuke.png'
      : event.type === 'auction_win'
        ? '/ui/icons/Icon_Thin_Auction.png'
        : '/ui/icons/Icon_Coin3.png',
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

  function handleClick() {
    selectLand(location, 2);
    activityStore.dismissToast(event.id);
  }

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    activityStore.dismissToast(event.id);
  }
</script>

<div
  class="bg-black/90 border border-gray-700 rounded-lg px-4 py-2
         shadow-lg backdrop-blur-sm min-w-[300px] max-w-[400px]
         hover:bg-black/95 transition-colors cursor-pointer flex items-center gap-3"
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabindex="0"
>
  <img src={icon} alt={event.type} class="w-6 h-6 flex-shrink-0" />

  <div class="flex-1 text-sm text-left">
    {#if event.type === 'land_buy'}
      <span class="text-gray-400">{getDisplayName(event.buyer)}</span>
      <span class="text-gray-300"> bought </span>
      <span class="text-blue-400">{event.locationString}</span>
    {:else if event.type === 'auction_win'}
      <span class="text-gray-400">{getDisplayName(event.buyer)}</span>
      <span class="text-green-400"> won auction </span>
      <span class="text-blue-400">{event.locationString}</span>
    {:else if event.type === 'nuke'}
      <span class="text-red-400">Nuke!</span>
      <span class="text-gray-300"> at </span>
      <span class="text-blue-400">{event.locationString}</span>
    {/if}
  </div>

  <button
    class="text-gray-500 hover:text-white text-lg flex-shrink-0 px-1"
    onclick={handleDismiss}
  >
    &times;
  </button>
</div>
