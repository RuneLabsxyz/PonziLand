<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import { Button } from '$lib/components/ui/button';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { claimAllOfToken } from '$lib/stores/claim.store.svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { groupLands, padAddress, parseLocation } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  async function handleClaimFromCoin(land: LandWithActions) {
    if (!land.token) {
      console.error("Land doesn't have a token");
      return;
    }

    claimAllOfToken(land.token, dojo, account()?.getWalletAccount()!).catch(
      (e) => {
        console.error('error claiming from coin', e);
      },
    );
  }

  let lands = $state<LandWithActions[]>([]);
  let unsubscribe: (() => void) | null = $state(null);

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
              return landOwner === userAddress;
            }
            return false;
          })
          .map((land) => createLandWithActions(land, () => allLands));

        lands = filteredLands;
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

<div class="h-full w-full pb-4">
  <ScrollArea class="h-full w-full" type="scroll">
    <div class="flex flex-col">
      {#each lands as land}
        <button
          class="w-full text-left hover:bg-white/10 p-2 land-button"
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
          <LandHudInfo {land} isOwner={true} showLand={true} />
        </button>
      {/each}
      {#if lands.length === 0}
        <div class="text-center text-gray-400">You don't own any lands yet</div>
        <button
          class="text-yellow-500 hover:opacity-90 hover:cursor-pointer"
          onclick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            widgetsStore.addWidget({
              id: 'auctions',
              type: 'auctions',
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
    </div>
  </ScrollArea>
</div>

<style>
  .land-button:nth-child(odd) {
    background-color: hsl(240, 19%, 18%);
  }

  .land-button:nth-child(odd):hover {
    background-color: hsl(240, 19%, 20%);
  }
</style>
