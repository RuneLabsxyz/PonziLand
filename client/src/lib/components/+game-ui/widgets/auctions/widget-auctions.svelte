<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auctionLand';
  import { BuildingLand } from '$lib/api/land/buildingLand';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import { cursorStore } from '$lib/components/+game-map/three/cursor.store.svelte';
  import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { baseToken } from '$lib/stores/tokens.store.svelte';
  import { padAddress, parseLocation } from '$lib/utils';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  interface LandWithPrice extends LandWithActions {
    price: CurrencyAmount | null;
    priceLoading: boolean;
  }

  let lands = $state<LandWithPrice[]>([]);
  let unsubscribe: (() => void) | null = $state(null);
  let sortAscending = $state(true);

  // Function to fetch and update price for a land
  async function updateLandPrice(landWithPrice: LandWithPrice) {
    try {
      landWithPrice.priceLoading = true;
      const price = await landWithPrice.getCurrentAuctionPrice();
      landWithPrice.price = price ?? null;
      landWithPrice.priceLoading = false;

      // Re-sort the array after price update
      lands = sortLandsByPrice(lands);
    } catch (error) {
      console.error('Error fetching price for land:', error);
      landWithPrice.priceLoading = false;
    }
  }

  // Function to sort lands by price (null prices go to end)
  function sortLandsByPrice(landsToSort: LandWithPrice[]): LandWithPrice[] {
    return [...landsToSort].sort((a, b) => {
      // If both have prices, sort by price (ascending)
      if (a.price && b.price) {
        const comparison = a.price
          .rawValue()
          .minus(b.price.rawValue())
          .toNumber();
        return sortAscending ? comparison : -comparison; // Adjusted for ascending/descending
      }
      // If only one has a price, prioritize the one with price
      if (a.price && !b.price) return -1;
      if (!a.price && b.price) return 1;
      // If neither has a price, maintain original order
      return 0;
    });
  }

  onMount(async () => {
    try {
      if (!dojo.client) {
        console.error('Dojo client is not initialized');
        return;
      }

      const currentAccount = account()?.getWalletAccount();
      if (!currentAccount) {
        console.error('No wallet account available');
        return;
      }

      const userAddress = padAddress(currentAccount.address);

      const allLands = landStore.getAllLands();

      unsubscribe = allLands.subscribe((landsData) => {
        if (!landsData) {
          console.log('No lands data received');
          return;
        }

        const filteredLands = landsData
          .filter((land): land is BuildingLand => {
            return AuctionLand.is(land);
          })
          .map((land): LandWithPrice => {
            const landWithActions = createLandWithActions(land, () => allLands);
            return {
              ...landWithActions,
              price: null,
              priceLoading: false,
            };
          });

        lands = filteredLands;

        // Fetch prices for all lands
        lands.forEach((land) => {
          updateLandPrice(land);
        });
      });
    } catch (error) {
      console.error('Error in my-lands-widget setup:', error);
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

<div class="h-full w-full pb-16 min-h-0">
  <div class="flex items-center justify-end py-2 border-white/10">
    <button
      class="flex items-center gap-2 text-sm font-medium bg-blue-500 px-2"
      onclick={() => {
        sortAscending = !sortAscending;
        lands = sortLandsByPrice(lands);
      }}
    >
      Price
      {#if sortAscending}
        ▴
      {:else}
        ▾
      {/if}
    </button>
  </div>
  <ScrollArea class="h-full w-full" type="scroll">
    <div class="flex flex-col">
      {#each lands as land}
        <button
          class="relative w-full text-left flex gap-4 hover:bg-white/10 p-6 land-button"
          onclick={() => {
            const coordinates = parseLocation(land.location);
            const baseLand = landStore.getLand(coordinates[0], coordinates[1]);
            if (baseLand) {
              selectedLand.value = get(baseLand);
            }
            gameStore.cameraControls?.setLookAt(
              coordinates[0],
              50,
              coordinates[1],
              coordinates[0],
              0,
              coordinates[1],
              true,
            );
            const locationNumber = Number(land.location);
            if (cursorStore.selectedTileIndex == locationNumber)
              gameStore.cameraControls?.zoomTo(250, true);
            cursorStore.selectedTileIndex = locationNumber;
          }}
        >
          {#if land}
            <LandOverview size="xs" {land} />
          {/if}
          <div
            class="w-full flex items-center justify-start leading-none text-xl"
          >
            {#if land.priceLoading}
              <div class="flex gap-1 items-center">
                <span class="text-sm opacity-50">Loading...</span>
                <TokenAvatar class="w-5 h-5" token={baseToken} />
              </div>
            {:else if land.price}
              <div class="flex gap-1 items-center">
                <PriceDisplay price={land.price} />
                <TokenAvatar class="w-5 h-5" token={baseToken} />
              </div>
            {:else}
              <div class="flex gap-1 items-center">
                <span class="text-sm opacity-50">Price unavailable</span>
                <TokenAvatar class="w-5 h-5" token={baseToken} />
              </div>
            {/if}
          </div>
          <div class="absolute bottom-0 right-0 p-2"></div>
        </button>
      {/each}
    </div>
  </ScrollArea>
</div>

<style>
  .land-button:nth-child(odd) {
    background-color: #fff1;
  }

  .land-button:nth-child(odd):hover {
    background-color: #fff1;
  }
</style>
