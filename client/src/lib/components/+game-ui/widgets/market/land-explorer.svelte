<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { padAddress, parseLocation } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import data from '$profileData';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  let lands = $state<LandWithActions[]>([]);
  let unsubscribe: (() => void) | null = $state(null);
  let sortAscending = $state(true);
  let selectedTokenAddress = $state<string>('');

  // Derived states for filtering
  let availableTokens = $derived.by(() => {
    const tokens = new Set<string>();
    lands.forEach((land) => {
      if (land.token?.symbol) {
        tokens.add(land.token.symbol);
      }
    });
    return Array.from(tokens).sort();
  });

  let filteredLands = $derived.by(() => {
    let filtered = lands;

    // Token filter
    if (selectedTokenAddress) {
      filtered = filtered.filter(
        (land) => land.token?.address === selectedTokenAddress,
      );
    }

    return filtered;
  });

  // Function to sort lands by price
  function sortLandsByPrice(landsToSort: LandWithActions[]): LandWithActions[] {
    return [...landsToSort].sort((a, b) => {
      const priceA = a.sellPrice?.rawValue().toNumber() ?? 0;
      const priceB = b.sellPrice?.rawValue().toNumber() ?? 0;
      return sortAscending ? priceA - priceB : priceB - priceA;
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
          .map((land) => createLandWithActions(land, () => allLands));

        lands = sortLandsByPrice(filteredLands);
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

<div class="h-full w-full pb-16 min-h-0">
  <div class="flex items-center justify-between py-2 border-white/10">
    <div class="w-48">
      <TokenSelect bind:value={selectedTokenAddress} />
    </div>
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
      {#each filteredLands as land}
        <button
          class="relative w-full text-left flex gap-4 hover:bg-white/10 p-6 land-button"
          onclick={() => {
            moveCameraTo(
              parseLocation(land.location)[0] + 1,
              parseLocation(land.location)[1] + 1,
            );
            const coordinates = parseLocation(land.location);
            const baseLand = landStore.getLand(coordinates[0], coordinates[1]);
            if (baseLand) {
              selectedLand.value = get(baseLand);
            }
          }}
        >
          {#if land}
            <LandOverview size="xs" {land} />
          {/if}
          <div
            class="w-full flex items-center justify-start leading-none text-xl"
          >
            {#if land.sellPrice}
              <div class="flex gap-1 items-center">
                <PriceDisplay price={land.sellPrice} />
                <TokenAvatar class="w-5 h-5" token={land.token} />
              </div>
            {:else}
              <div class="flex gap-1 items-center">
                <span class="text-sm opacity-50">Price unavailable</span>
                <TokenAvatar class="w-5 h-5" token={land.token} />
              </div>
            {/if}
          </div>
          <div class="absolute bottom-0 right-0 p-2"></div>
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
