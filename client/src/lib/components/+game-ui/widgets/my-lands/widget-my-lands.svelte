<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { claimAll, claimAllOfToken } from '$lib/stores/claim.store.svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { padAddress, parseLocation } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { get } from 'svelte/store';
  import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
  import { cursorStore } from '$lib/components/+game-map/three/cursor.store.svelte';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  // Claiming state management
  let claimingAll = $state(false);
  let claimingTokens = $state<string[]>([]);
  let claimCooldowns = $state<Record<string, number>>({});
  let timerIntervals: Record<string, NodeJS.Timeout> = {};

  // Method 1: Using setInterval with counter
  function soundAtInterval(nbLands: number) {
    let count = 0;

    const intervalId = setInterval(() => {
      count++;
      gameSounds.play('claim');

      if (count >= nbLands) {
        clearInterval(intervalId);
      }
    }, 200);
  }

  function startCooldown(key: string, duration: number = 30000) {
    claimCooldowns = { ...claimCooldowns, [key]: duration / 1000 };

    const intervalId = setInterval(() => {
      const currentTime = claimCooldowns[key];
      if (currentTime && currentTime > 0) {
        claimCooldowns = { ...claimCooldowns, [key]: currentTime - 1 };
      } else {
        const { [key]: removed, ...rest } = claimCooldowns;
        claimCooldowns = rest;
        clearInterval(intervalId);
        delete timerIntervals[key];
      }
    }, 1000);

    timerIntervals[key] = intervalId;
  }

  async function handleClaimAll() {
    claimingAll = true;
    claimAll(dojo, account()?.getWalletAccount()!)
      .then(() => {
        soundAtInterval(lands.length);
        startCooldown('all');
      })
      .catch((e) => {
        console.error('error claiming ALL', e);
      })
      .finally(() => {
        claimingAll = false;
      });
  }

  async function handleClaimFromCoin(
    land: LandWithActions | undefined,
    nbLands: number = 1,
  ) {
    if (!land || !land.token) {
      console.error("Land doesn't have a token");
      return;
    }

    const tokenKey = land.token.symbol || land.token.name || 'unknown';
    claimingTokens = [...claimingTokens, tokenKey];

    claimAllOfToken(land.token, dojo, account()?.getWalletAccount()!)
      .then(() => {
        soundAtInterval(nbLands);
        startCooldown(tokenKey);
      })
      .catch((e) => {
        console.error('error claiming from coin', e);
      })
      .finally(() => {
        claimingTokens = claimingTokens.filter((t) => t !== tokenKey);
      });
  }

  // Reactive lands state that updates automatically on ownership changes
  let lands = $state<LandWithActions[]>([]);

  // Effect to reactively update lands when ownership or land data changes
  $effect(() => {
    const currentAccount = account()?.getWalletAccount();
    if (!currentAccount || !dojo.client) {
      lands = [];
      return;
    }

    const userAddress = padAddress(currentAccount.address);
    const ownedIndicesStore = landStore.getOwnedLandIndicesStore(userAddress);
    const allLandsStore = landStore.getAllLands();

    // Subscribe to ownership index changes
    const unsubscribeOwnership = ownedIndicesStore.subscribe((ownedIndices) => {
      // Get current lands data
      const currentAllLands = get(allLandsStore);
      
      const newLands = ownedIndices
        .map((index: number) => currentAllLands[index])
        .filter((land): land is BuildingLand => BuildingLand.is(land))
        .map((land: BuildingLand) => createLandWithActions(land, () => landStore.getAllLands()));
      
      lands = newLands;
    });

    // Subscribe to all lands changes (in case land properties change)
    const unsubscribeAllLands = allLandsStore.subscribe((allLands) => {
      // Get current ownership indices
      const currentOwnedIndices = get(ownedIndicesStore);
      
      const newLands = currentOwnedIndices
        .map((index: number) => allLands[index])
        .filter((land): land is BuildingLand => BuildingLand.is(land))
        .map((land: BuildingLand) => createLandWithActions(land, () => landStore.getAllLands()));
      
      lands = newLands;
    });

    // Cleanup function
    return () => {
      unsubscribeOwnership();
      unsubscribeAllLands();
    };
  });

  // Filter and grouping state
  let selectedToken = $state<string>('all');
  let selectedLevel = $state<string>('all');
  let groupByToken = $state<boolean>(true);
  let sortBy = $state<'location' | 'level' | 'date' | 'price'>('price');
  let sortOrder = $state<'asc' | 'desc'>('asc');

  let filteredLands = $derived.by(() => {
    let filtered = lands.filter((land: LandWithActions) => {
      // Token filter
      if (selectedToken !== 'all' && land.token_used !== selectedToken) {
        return false;
      }

      // Level filter
      if (selectedLevel !== 'all' && land.level?.toString() !== selectedLevel) {
        return false;
      }

      return true;
    });

    // Sort lands
    filtered.sort((a: LandWithActions, b: LandWithActions) => {
      let comparison = 0;

      switch (sortBy) {
        case 'location':
          const locA = parseLocation(a.location);
          const locB = parseLocation(b.location);
          comparison = locA[0] - locB[0] || locA[1] - locB[1];
          break;
        case 'level':
          comparison = (a.level || 0) - (b.level || 0);
          break;
        case 'date':
          comparison =
            Number(a.block_date_bought) - Number(b.block_date_bought);
          break;
        case 'price':
          comparison = Number(a.sell_price) - Number(b.sell_price);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  });

  let groupedLands = $derived.by(() => {
    if (!groupByToken) {
      return { 'All Lands': filteredLands };
    }

    const groups: { [key: string]: LandWithActions[] } = {};

    filteredLands.forEach((land: LandWithActions) => {
      const token = land.token_used || 'No Token';
      if (!groups[token]) {
        groups[token] = [];
      }
      groups[token].push(land);
    });

    return groups;
  });

  function handleLandClick(land: LandWithActions) {
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

    const transposedLocation = coordinates[0] * 64 + coordinates[1];
    if (cursorStore.selectedTileIndex == transposedLocation)
      gameStore.cameraControls?.zoomTo(250, true);
    cursorStore.selectedTileIndex = transposedLocation;
  }

  // Cleanup timers when component is destroyed
  $effect(() => {
    return () => {
      Object.values(timerIntervals).forEach((interval) => {
        clearInterval(interval);
      });
    };
  });
</script>

<div class="h-full w-full flex flex-col pb-4">
  <!-- Filters and Controls -->
  <div class="flex py-2 border-b border-gray-700 items-center justify-between">
    <div class="flex items-center gap-2">
      <input
        type="checkbox"
        bind:checked={groupByToken}
        id="groupByToken"
        class="rounded"
      />
      <label for="groupByToken" class="text-sm font-medium text-gray-300">
        Group by Token
      </label>
    </div>

    <div class="flex gap-2">
      <div class="text-gray-200">total lands ( {lands.length} )</div>
      <button
        onclick={() => {
          if (sortBy === 'price') {
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
          }

          sortBy = 'price';
        }}
        class="border border-blue-500 px-2 text-sm font-medium flew items-center justify-center {sortBy ==
        'price'
          ? 'bg-blue-500 text-white'
          : 'text-blue-500'}"
      >
        Price {sortBy == 'price' ? (sortOrder === 'asc' ? '▴' : '▾') : ''}
      </button>
      <button
        onclick={() => {
          if (sortBy === 'date') {
            sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
          }
          sortBy = 'date';
        }}
        class="border border-blue-500 px-2 text-sm font-medium flew items-center justify-center {sortBy ==
        'date'
          ? 'bg-blue-500 text-white'
          : 'text-blue-500'}"
      >
        Date {sortBy == 'date' ? (sortOrder === 'asc' ? '▴' : '▾') : ''}
      </button>
    </div>
  </div>
  <!-- Lands List -->
  <ScrollArea type="scroll">
    <div class="flex flex-col">
      {#if lands.length > 0}
        <Button
          size="lg"
          class="sticky top-0 z-10"
          disabled={claimingAll || 'all' in claimCooldowns}
          onclick={() => {
            handleClaimAll();
          }}
        >
          {#if claimingAll}
            CLAIMING...
          {:else if 'all' in claimCooldowns}
            CLAIM ALL ({claimCooldowns['all']}s)
          {:else}
            CLAIM ALL
          {/if}
        </Button>
      {/if}
      {#each Object.entries(groupedLands) as [, groupLands]}
        {#if groupByToken && Object.keys(groupedLands).length >= 1}
          {@const token = groupLands.at(0)?.token}
          {@const tokenKey = token?.symbol || token?.name || 'unknown'}
          <div
            class="px-4 py-2 bg-gray-800 border-b border-gray-700 sticky top-0 z-10 flex gap-2 items-center"
          >
            <h3 class="font-semibold text-gray-200">
              {token?.name} ({groupLands.length})
            </h3>
            <Button
              size="md"
              disabled={claimingTokens.includes(tokenKey) ||
                tokenKey in claimCooldowns}
              onclick={() => {
                handleClaimFromCoin(groupLands.at(0), groupLands.length);
              }}
            >
              {#if claimingTokens.includes(tokenKey)}
                CLAIMING...
              {:else if tokenKey in claimCooldowns}
                CLAIM ALL ({claimCooldowns[tokenKey]}s)
              {:else}
                CLAIM ALL
              {/if}
              <span class="text-yellow-500">
                &nbsp;{token?.symbol}&nbsp;
              </span>
            </Button>
          </div>
        {/if}

        {#each groupLands as land}
          <button
            class="w-full text-left hover:bg-white/10 p-2 land-button"
            class:group-item={groupByToken}
            onclick={() => handleLandClick(land)}
          >
            <LandHudInfo {land} isOwner={true} showLand={true} />
          </button>
        {/each}
      {/each}
      {#if lands.length === 0}
        <div class="text-center text-gray-400">You don't own any lands yet</div>
        <button
          class="text-yellow-500 hover:opacity-90 hover:cursor-pointer"
          onclick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            widgetsStore.addWidget({
              id: 'market',
              type: 'market',
              position: { x: 40, y: 30 },
              dimensions: { width: 450, height: 600 },
              isMinimized: false,
              isOpen: true,
            });
          }}
        >
          See ongoing auctions
        </button>
      {/if}
      {#if filteredLands.length === 0}
        <div class="p-8 text-center text-gray-400">
          <p>No lands found matching your filters.</p>
        </div>
      {/if}
    </div>
  </ScrollArea>
</div>

<style>
  .group-item {
    margin-left: 0;
    border-left: 3px solid transparent;
  }

  .group-item:hover {
    border-left-color: #60a5fa;
  }
</style>
