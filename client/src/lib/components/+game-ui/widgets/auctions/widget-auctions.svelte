<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import LandHudAuction from '$lib/components/+game-map/land/hud/land-hud-auction.svelte';
  import LandHudInfo from '$lib/components/+game-map/land/hud/land-hud-info.svelte';
  import LandOverview from '$lib/components/+game-map/land/land-overview.svelte';
  import { Button } from '$lib/components/ui/button';
  import PriceDisplay from '$lib/components/ui/price-display.svelte';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { moveCameraTo } from '$lib/stores/camera.store';
  import { claimAllOfToken } from '$lib/stores/claim.store.svelte';
  import { landStore, selectedLand } from '$lib/stores/store.svelte';
  import { baseToken } from '$lib/stores/tokens.store.svelte';
  import { groupLands, padAddress, parseLocation } from '$lib/utils';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
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
            return AuctionLand.is(land);
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

  let currentPrice = $state<CurrencyAmount>();
  let priceDisplay = $derived(currentPrice?.toString());
</script>

<div class="h-full w-full pb-4">
  <ScrollArea class="h-full w-full" type="scroll">
    <div class="flex flex-col">
      {#each lands as land}
        <button
          class="w-full text-left flex gap-2 hover:bg-white/10 p-2 land-button"
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
            <LandOverview {land} />
          {/if}
          <div class="w-full flex items-center justify-end leading-none">
            {#await land.getCurrentAuctionPrice() then price}
              <div class="flex gap-1 items-center">
                <PriceDisplay {price} />
                <TokenAvatar class="w-8 h-8" token={baseToken} />
              </div>
            {/await}
          </div>
        </button>
      {/each}
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
