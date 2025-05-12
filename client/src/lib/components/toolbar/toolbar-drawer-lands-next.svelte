<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { claimAllOfToken } from '$lib/stores/claim.svelte';
  import { usePlayerLands } from '$lib/stores/stores.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { groupLands, padAddress } from '$lib/utils';
  import LandHudInfo from '../land/hud/land-hud-info.svelte';
  import { ScrollArea } from '../ui/scroll-area';
  import LandNukeTime from '../land/land-nuke-time.svelte';
  import { moveCameraTo } from '$lib/stores/camera';
  import { selectLand } from '$lib/stores/stores.svelte';
  import { parseLocation } from '$lib/utils';
  import { landStore } from '../../../routes/next/store.svelte';
  import { derived } from 'svelte/store';
  import { Building } from 'lucide-svelte';
  import { BuildingLand } from '$lib/api/land/building_land';

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

  let lands = landStore.getAllLands();
  let playerLands = derived(lands, (lands) => {
    return lands.filter((land) => {
      if (BuildingLand.is(land)) {
        return land.owner === padAddress(account()?.getWalletAccount()?.address ?? '');
      }
      return false;
    });
  });
</script>

<div class="text-lg font-semibold">My Lands</div>
<ScrollArea class="h-full w-full relative">
  <div class="flex flex-col items-center">
    {#each $playerLands as land}
      <h1>{land.location.x} : {land.location.y}</h1>
    {/each}

    <!-- {#each groupedLands as [key, lands]}
      <div class="w-full mb-4">
        <div class="font-bold text-md mb-2 mt-2">
          {lands[0].token?.name}
        </div>
        <div class="flex flex-col gap-2">
          {#each lands as land}
            <button
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
    {/each} -->
  </div>
</ScrollArea>
