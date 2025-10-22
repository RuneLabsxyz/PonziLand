<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import { cursorStore } from '$lib/components/+game-map/three/cursor.store.svelte';
  import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
  import TokenSelect from '$lib/components/ui/token/token-select.svelte';
  import { Input } from '$lib/components/ui/input';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import type { Token } from '$lib/interfaces';
  import { usernamesStore } from '$lib/stores/account.store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import {
    highlightedLands,
    landStore,
    selectedLand,
  } from '$lib/stores/store.svelte';
  import { padAddress, parseLocation } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import data from '$profileData';
  import { toNumber } from 'ethers';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';

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
    convertedPrice: CurrencyAmount | null;
    convertedPriceLoading: boolean;
  }

  let lands = $state<LandWithPrice[]>([]);
  let unsubscribe: (() => void) | null = $state(null);
  let sortAscending = $state(true);
  let selectedToken = $state<Token | undefined>();
  let sortBy = $state<'price' | 'level'>('price');
  let searchQuery = $state('');

  // Function to get AI agent info
  function getAiAgent(ownerAddress: string) {
    return data.aiAgents.find(
      (agent) => padAddress(agent.address) === padAddress(ownerAddress),
    );
  }

  // Function to get username for an address
  function getUsername(address: string): string | undefined {
    const paddedAddress = padAddress(address);
    if (!paddedAddress) return undefined;
    return usernamesStore.getUsernames()[paddedAddress];
  }

  let filteredLands = $derived.by(() => {
    let filtered = lands;

    // Token filter
    if (selectedToken) {
      filtered = filtered.filter(
        (land) => land.token?.address === selectedToken?.address,
      );
    }

    // Username search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((land) => {
        const aiAgent = getAiAgent(land.owner);
        if (aiAgent) {
          return aiAgent.name.toLowerCase().includes(query);
        }
        const username = getUsername(land.owner);
        if (username) {
          return username.toLowerCase().includes(query);
        }
        // If no username found, search in the address
        return land.owner.toLowerCase().includes(query);
      });
    }

    return filtered;
  });

  // Update highlighted lands when filters change
  $effect(() => {
    if (selectedToken || searchQuery) {
      highlightedLands.value = filteredLands.map((land) => land.location);
    } else {
      highlightedLands.value = [];
    }
  });

  // Function to fetch and update converted price for a land
  async function updateLandConvertedPrice(landWithPrice: LandWithPrice) {
    try {
      // Only convert if land has a sell price and token differs from base token
      if (landWithPrice.sellPrice && landWithPrice.token) {
        landWithPrice.convertedPriceLoading = true;
        try {
          const convertedPrice = walletStore.convertTokenAmount(
            landWithPrice.sellPrice,
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
    } catch (error) {
      console.error('Error updating converted price for land:', error);
      landWithPrice.convertedPriceLoading = false;
    }
  }

  // Function to sort lands
  function sortLands(landsToSort: LandWithPrice[]): LandWithPrice[] {
    return [...landsToSort].sort((a, b) => {
      if (sortBy === 'price') {
        const priceA = a.convertedPrice?.rawValue().toNumber() ?? 0;
        const priceB = b.convertedPrice?.rawValue().toNumber() ?? 0;
        return sortAscending ? priceA - priceB : priceB - priceA;
      } else {
        // Sort by level first, then by purchase date
        const levelA = a.level ?? 0;
        const levelB = b.level ?? 0;

        if (levelA !== levelB) {
          return sortAscending ? levelA - levelB : levelB - levelA;
        }

        // If levels are equal, sort by purchase date
        const dateA = toNumber(a.block_date_bought);
        const dateB = toNumber(b.block_date_bought);
        return sortAscending ? dateB - dateA : dateA - dateB;
      }
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
            if (BuildingLand.is(land)) {
              const landOwner = padAddress(land.owner);
              // Only show lands that are for sale and not owned by the current user
              return landOwner !== userAddress && land.sell_price !== '0';
            }
            return false;
          })
          .map((land): LandWithPrice => {
            const landWithActions = createLandWithActions(land, () => allLands);
            return {
              ...landWithActions,
              convertedPrice: null,
              convertedPriceLoading: false,
            };
          });

        // Fetch converted prices for all lands
        filteredLands.forEach((land) => {
          updateLandConvertedPrice(land);
        });

        lands = sortLands(filteredLands);
      });
    } catch (error) {
      console.error('Error in land-explorer setup:', error);
    }
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });
</script>

<div class="h-full w-full pb-28 min-h-0">
  <div class="flex flex-col gap-2 py-2 border-white/10 min-h-0">
    <div class="flex items-center gap-2">
      <div class="w-48">
        <TokenSelect
          bind:value={selectedToken}
          variant="swap"
          tutorialEnabled={true}
        />
      </div>
      {#if selectedToken}
        <button
          class="text-sm font-medium text-gray-400 hover:text-white"
          onclick={() => (selectedToken = undefined)}
        >
          reset
        </button>
      {/if}
      <div class="flex-1">
        <Input
          type="text"
          placeholder="Search by username..."
          bind:value={searchQuery}
          class="w-full"
        />
      </div>
    </div>
    <div class="flex justify-between">
      <span class="text-sm text-gray-400 pl-1">
        {filteredLands.length}
        {filteredLands.length === 1 ? 'land' : 'lands'}
      </span>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-2 text-sm font-medium {sortBy === 'price'
            ? 'bg-blue-500'
            : 'text-blue-500'} px-2"
          onclick={() => {
            if (sortBy === 'price') {
              sortAscending = !sortAscending;
            }
            sortBy = 'price';
            lands = sortLands(lands);
          }}
        >
          Price
          {#if sortBy === 'price'}
            {#if sortAscending}
              ▴
            {:else}
              ▾
            {/if}
          {/if}
        </button>
        <button
          class="flex items-center gap-2 text-sm font-medium {sortBy === 'level'
            ? 'bg-blue-500'
            : 'text-blue-500'} px-2"
          onclick={() => {
            if (sortBy === 'level') {
              sortAscending = !sortAscending;
            }
            sortBy = 'level';
            lands = sortLands(lands);
          }}
        >
          Level
          {#if sortBy === 'level'}
            {#if sortAscending}
              ▴
            {:else}
              ▾
            {/if}
          {/if}
        </button>
      </div>
    </div>
  </div>
  <ScrollArea class="h-full w-full min-h-0" type="scroll">
    <div class="flex flex-col">
      {#each filteredLands as land}
        <button
          class="relative w-full text-left flex gap-6 hover:bg-white/10 p-6 land-button"
          onclick={() => {
            moveCameraTo(
              parseLocation(land.location)[0] + 1,
              parseLocation(land.location)[1] + 1,
            );
            const location = parseLocation(land.location);
            gameStore.cameraControls?.setLookAt(
              location[0],
              50,
              location[1],
              location[0],
              0,
              location[1],
              true,
            );
            console.log(
              'location number',
              land.location,
              Number(land.location),
            );
            cursorStore.selectedTileIndex = Number(land.location);
            const coordinates = parseLocation(land.location);
            const baseLand = landStore.getLand(coordinates[0], coordinates[1]);
            if (baseLand) {
              selectedLand.value = get(baseLand);
            }
          }}
        >
          {#if land}
            <LandOverview size="xs" {land} hideLevelUp={sortBy !== 'level'} />
          {/if}
          <div
            class="w-full flex flex-col items-start justify-center leading-none text-xl"
          >
            {#if land.sellPrice}
              <div class="flex gap-1 items-center">
                <PriceDisplay
                  price={land.sellPrice}
                  token={land.token}
                  showRate
                />
              </div>
            {:else}
              <div class="flex gap-1 items-center">
                <span class="text-sm opacity-50">Price unavailable</span>
                <TokenAvatar class="w-5 h-5" token={land.token} />
              </div>
            {/if}
          </div>
          <div
            class="absolute bottom-2 right-2 flex flex-col items-end text-xs text-gray-400"
          >
            <div class="flex items-center gap-1">
              <span>Stake:</span>
              <span>{land.stakeAmount}</span>
            </div>
            <div class="flex items-center gap-1">
              <span>Owner:</span>
              {#if getAiAgent(land.owner)}
                {@const aiAgent = getAiAgent(land.owner)}
                <div class="flex items-center gap-1">
                  <img
                    src={aiAgent?.badgeImage}
                    alt={aiAgent?.name}
                    class="w-4 h-4"
                  />
                  <span> {aiAgent?.name} </span>
                </div>
              {:else}
                <span>
                  {getUsername(land.owner)}
                </span>
              {/if}
            </div>
          </div>
        </button>
      {/each}
      {#if filteredLands.length === 0}
        <div class="text-center text-gray-400 p-8">
          {#if lands.length === 0}
            No lands are currently for sale
          {:else}
            No lands found matching your filters
          {/if}
        </div>
      {/if}
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
