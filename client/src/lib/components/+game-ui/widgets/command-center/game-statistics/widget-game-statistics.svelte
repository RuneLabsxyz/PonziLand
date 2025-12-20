<script lang="ts">
  import type { BaseLand, LandWithActions } from '$lib/api/land';
  import { BuildingLand } from '$lib/api/land/building_land';
  import { ScrollArea } from '$lib/components/ui/scroll-area';
  import { Separator } from '$lib/components/ui/separator';
  import { landStore } from '$lib/stores/store.svelte';
  import { locationToCoordinates, padAddress } from '$lib/utils';
  import { createLandWithActions } from '$lib/utils/land-actions';
  import { derived } from 'svelte/store';
  import { onMount, onDestroy } from 'svelte';
  import account from '$lib/account.svelte';
  import type { Snippet } from 'svelte';
  import DailySummary from './daily-summary.svelte';
  import BuildingHighlights from './building-highlights.svelte';
  import GameStats from './game-stats.svelte';

  type Props = {
    setCustomTitle?: (title: Snippet<[]> | null) => void;
    setCustomControls?: (controls: Snippet<[]> | null) => void;
  };

  let { setCustomTitle, setCustomControls }: Props = $props();

  let lands = $state<LandWithActions[]>([]);
  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    setupLandsSubscription();
  });

  onDestroy(() => {
    if (unsubscribe) {
      unsubscribe();
    }
  });

  // Re-setup subscription when account changes
  $effect(() => {
    const address = account.address;
    // Cleanup old subscription and setup new one
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    setupLandsSubscription();
  });

  function setupLandsSubscription() {
    if (!account.address) {
      lands = [];
      return;
    }

    const userAddress = padAddress(account.address);
    if (!userAddress) {
      lands = [];
      return;
    }

    const ownedIndicesStore = landStore.getOwnedLandIndicesStore(userAddress);
    const allLandsStore = landStore.getCurrentLands();

    // Combined derived store
    const combinedStore = derived(
      [ownedIndicesStore, allLandsStore],
      ([ownedIndices, allLands]: [number[], BaseLand[][]]) => {
        if (!account.isConnected) return [];
        return ownedIndices
          .map((index: number) => {
            const coordinates = locationToCoordinates(index);
            const land = allLands[coordinates.x]?.[coordinates.y];
            return land;
          })
          .filter((land: any): land is BuildingLand => BuildingLand.is(land))
          .map((land: BuildingLand) =>
            createLandWithActions(land, () => landStore.getAllLands()),
          );
      },
    );

    unsubscribe = combinedStore.subscribe((newLands: LandWithActions[]) => {
      lands = newLands;
    });
  }
</script>

{#if !account.isConnected}
  <div class="flex flex-col items-center justify-center h-full gap-4 p-4">
    <div class="text-center">
      <h3 class="text-lg font-semibold mb-2">Connect Wallet Required</h3>
      <p class="text-sm opacity-75">
        Connect your wallet to view your game statistics.
      </p>
    </div>
  </div>
{:else}
  <ScrollArea type="scroll" class="h-full">
    <div class="flex flex-col gap-4 p-2">
      <DailySummary {lands} />

      <Separator class="opacity-30" />

      <BuildingHighlights {lands} />

      <Separator class="opacity-30" />

      <GameStats {lands} />
    </div>
  </ScrollArea>
{/if}
