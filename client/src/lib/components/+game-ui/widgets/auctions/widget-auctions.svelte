<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import { cursorStore } from '$lib/components/+game-map/three/cursor.store.svelte';
  import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { parseLocation } from '$lib/utils';
  import data from '$profileData';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { Fullscreen, RefreshCw } from 'lucide-svelte';
  import { openLandInfoWidget } from '../../game-ui.svelte';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import type { Snippet } from 'svelte';

  let {
    setCustomControls,
  }: {
    setCustomControls: (controls: Snippet<[]> | null) => void;
  } = $props();

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return (
      data.availableTokens.find((token) => token.address === targetAddress) ||
      data.availableTokens.find(
        (token) => token.address === data.mainCurrencyAddress,
      )!
    );
  });

  interface LandWithPrice extends LandWithActions {
    price: CurrencyAmount | null;
    priceLoading: boolean;
    convertedPrice: CurrencyAmount | null;
    convertedPriceLoading: boolean;
  }

  let lands = $state<LandWithPrice[]>([]);
  let unsubscribe: (() => void) | null = $state(null);
  let sortAscending = $state(true);
  let refreshing = $state(false);

  // Function to move camera to land location
  function moveToLand(land: LandWithPrice) {
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
  }

  // Function to refresh auctions data
  async function refreshAuctions() {
    if (refreshing) return;

    refreshing = true;
    try {
      // Get fresh land data
      const allLands = landStore.getAllLands();
      const currentLands = get(allLands);

      if (currentLands) {
        // Filter and recreate auction lands
        const filteredLands = currentLands
          .filter((land): land is BuildingLand => {
            return AuctionLand.is(land);
          })
          .map((land): LandWithPrice => {
            const landWithActions = createLandWithActions(land, () => allLands);
            return {
              ...landWithActions,
              price: null,
              priceLoading: false,
              convertedPrice: null,
              convertedPriceLoading: false,
            };
          });

        lands = filteredLands;

        // Refresh prices for all lands
        await Promise.all(lands.map((land) => updateLandPrice(land)));
      }
    } catch (error) {
      console.error('Error refreshing auctions:', error);
    } finally {
      refreshing = false;
    }
  }

  // Function to fetch and update price for a land
  async function updateLandPrice(landWithPrice: LandWithPrice) {
    try {
      landWithPrice.priceLoading = true;
      const price = await landWithPrice.getCurrentAuctionPrice();
      landWithPrice.price = price ?? null;
      landWithPrice.priceLoading = false;

      // Fetch converted price if original token differs from base token
      if (
        price &&
        landWithPrice.token &&
        landWithPrice.token.address !== baseToken.address
      ) {
        landWithPrice.convertedPriceLoading = true;
        try {
          const convertedPrice = walletStore.convertTokenAmount(
            price,
            landWithPrice.token,
            baseToken,
          );
          landWithPrice.convertedPrice = convertedPrice;
        } catch (error) {
          console.error('Error converting price:', error);
          landWithPrice.convertedPrice = null;
        }
        landWithPrice.convertedPriceLoading = false;
      } else {
        landWithPrice.convertedPrice = null;
        landWithPrice.convertedPriceLoading = false;
      }

      // Re-sort the array after price update
      lands = sortLandsByPrice(lands);
    } catch (error) {
      console.error('Error fetching price for land:', error);
      landWithPrice.priceLoading = false;
      landWithPrice.convertedPriceLoading = false;
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
    // Set up custom controls for the parent draggable component
    setCustomControls(refreshControls);
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
              convertedPrice: null,
              convertedPriceLoading: false,
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
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          class="relative w-full text-left flex gap-4 hover:bg-white/10 p-6 land-button group cursor-pointer"
          onclick={() => moveToLand(land)}
        >
          {#if land}
            <LandOverview size="xs" {land} />
          {/if}
          <div
            class="w-full flex flex-col items-start justify-center leading-none text-xl"
          >
            {#if land.priceLoading}
              <div class="flex gap-1 items-center">
                <span class="text-sm opacity-50">Loading...</span>
                <TokenAvatar class="w-5 h-5" token={land.token} />
              </div>
            {:else if land.price}
              <div class="flex gap-1 items-center">
                <PriceDisplay price={land.price} />
                <TokenAvatar class="w-5 h-5" token={land.token} />
              </div>
              {#if land.convertedPrice && land.token && land.token.address !== baseToken.address}
                <div
                  class="flex gap-1 items-center text-xs opacity-60 h-0 mt-2"
                >
                  ≈ {land.convertedPrice}
                  {baseToken.symbol}
                </div>
              {:else if land.convertedPriceLoading}
                <div
                  class="flex gap-1 items-center text-xs opacity-50 h-0 mt-2"
                >
                  <span>Converting...</span>
                  <TokenAvatar class="w-3 h-3" token={baseToken} />
                </div>
              {/if}
            {:else}
              <div class="flex gap-1 items-center">
                <span class="text-sm opacity-50">Price unavailable</span>
                <TokenAvatar class="w-5 h-5" token={land.token} />
              </div>
            {/if}
          </div>
          <!-- Fullscreen icon button -->
          <button
            class="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            onclick={(e) => {
              e.stopPropagation();
              moveToLand(land);
              openLandInfoWidget(land);
            }}
            title="Open land details"
          >
            <Fullscreen class="w-4 h-4 text-white" />
          </button>
        </div>
      {/each}
    </div>
  </ScrollArea>
</div>

{#snippet refreshControls()}
  {#if refreshing}
    <div class="w-6 h-6 flex items-center justify-center">
      <RotatingCoin />
    </div>
  {:else}
    <button
      class="window-control"
      onclick={refreshAuctions}
      aria-label="Refresh auctions"
      title="Refresh auction data and prices"
    >
      <RefreshCw size={16} />
    </button>
  {/if}
{/snippet}

<style>
  .land-button:nth-child(odd) {
    background-color: #fff1;
  }

  .land-button:nth-child(odd):hover {
    background-color: #fff1;
  }
</style>
