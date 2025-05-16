<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { claimAllOfToken } from '$lib/stores/claim.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { groupLands, padAddress } from '$lib/utils';
  import LandHudInfo from '$lib/components/land/hud/land-hud-info.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import LandNukeTime from '$lib/components/land/land-nuke-time.svelte';
  import { moveCameraTo } from '$lib/stores/camera';
  import { selectLand } from '$lib/stores/stores.svelte';
  import { parseLocation } from '$lib/utils';
  import { createLandWithActions } from '../store.svelte';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { onMount, onDestroy } from 'svelte';
  import { LandTileStore } from '$lib/api/land_tiles.svelte';

  const dojo = useDojo();
  const account = () => {
    return dojo.accountManager?.getProvider();
  };

  async function handleClaimFromCoin(land: LandWithActions) {
    console.log('claiming from coin');

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
    console.log('Mounting my-lands-widget');
    
    // Setup the store with the client
    await landTileStore.setup(dojo.client);
    console.log('Store setup complete');

    const allLands = landTileStore.getAllLands();
    console.log('Got allLands store', allLands);
    
    unsubscribe = allLands.subscribe((landsData) => {
      console.log('Received lands update', landsData);
      if (!landsData) return;
      
      const filteredLands = landsData
        .filter((land): land is BuildingLand => {
          if (BuildingLand.is(land)) {
            const owner = padAddress(account()?.getWalletAccount()?.address ?? '');
            console.log('Comparing owners:', { landOwner: land.owner, userOwner: owner });
            return land.owner === owner;
          }
          return false;
        })
        .map((land) => createLandWithActions(land));
      
      console.log('Filtered lands:', filteredLands);
      lands = filteredLands;
    });
  });

  onDestroy(() => {
    console.log('Unmounting my-lands-widget');
    if (unsubscribe) {
      unsubscribe();
    }
    landTileStore.cleanup();
  });

  const groupedLands = $derived(groupLands(lands));
</script>

<div class="p-4 rounded-lg text-white">
  <ScrollArea class="h-[400px] w-[300px]">
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
                  selectLand(land);
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
            uiStore.toolbarActive = 'auctions';
          }}
        >
          See ongoing auctions
        </button>
      {/if}
    </div>
  </ScrollArea>
</div>
