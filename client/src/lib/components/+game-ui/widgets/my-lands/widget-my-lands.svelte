<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { LandTileStore } from '$lib/api/land_tiles.svelte';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import LandNukeTime from '$lib/components/+game-map/land/land-nuke-time.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { claimAllOfToken } from '$lib/stores/claim.store.svelte';
  import {
    createLandWithActions,
    selectedLand,
  } from '$lib/stores/store.svelte';
  import { groupLands, padAddress, parseLocation } from '$lib/utils';
  import { onDestroy, onMount } from 'svelte';

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
  const landTileStore = new LandTileStore();

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

      // Setup the store with the client
      await landTileStore.setup(dojo.client);

      const allLands = landTileStore.getAllLands();

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
          .map((land) => createLandWithActions(land));

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
    landTileStore.cleanup();
  });

  const groupedLands = $derived(groupLands(lands));
</script>

<div class="relative h-full w-full">
  <ScrollArea class="w-full h-full" type="scroll">
    <div class="flex flex-col items-center">
      {#each groupedLands as [key, lands]}
        <div class="w-full mb-4">
          <div class="font-bold text-md mb-2 mt-2">
            {lands[0].token?.name}
          </div>
          <div class="flex flex-col gap-2">
            {#each lands as land}
              <button
                class="w-full text-left hover:bg-white/10 p-2 rounded transition-colors"
                onclick={() => {
                  moveCameraTo(
                    parseLocation(land.location)[0] + 1,
                    parseLocation(land.location)[1] + 1,
                  );
                  selectedLand.value = land;
                }}
              >
                <LandHudInfo {land} isOwner={true} showLand={true} />
                <div class="translate-y-4 p-4">
                  <LandNukeTime {land} />
                </div>
              </button>

              <hr class="border-t border-gray-300 w-full my-2" />
            {/each}
          </div>
          <div class="flex justify-end mt-2">
            <button
              class="my-2 px-4 py-2 rounded bg-yellow-500 text-white hover:opacity-90 transition"
              onclick={() => handleClaimFromCoin(lands[0])}
            >
              Claim All
            </button>
          </div>
        </div>
      {/each}
      {#if lands.length === 0}
        <div class="text-center text-sm text-gray-400">
          You don't own any lands yet
        </div>
        <button
          class="text-sm text-yellow-500 hover:opacity-90 hover:cursor-pointer"
          onclick={() => {
            // uiStore.toolbarActive = 'auctions';
          }}
        >
          See ongoing auctions
        </button>
      {/if}
    </div>
  </ScrollArea>
</div>

<style>
  .landinfo-container {
    container-type: inline-size;
    container-name: landinfo;
  }

  @container landinfo (min-width: 700px) {
    .landinfo-content {
      flex-direction: row;
    }
  }

  @container landinfo (max-width: 699px) {
    .landinfo-content {
      flex-direction: column;
    }
  }
</style>
