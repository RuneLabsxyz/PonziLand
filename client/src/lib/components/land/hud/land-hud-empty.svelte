<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { selectedLand, selectedLandMeta } from '$lib/stores/stores.svelte';
  import LandOverview from '../land-overview.svelte';

  const landStore = useLands();

  let selectedToken = $state<Token | null>(null);
  let startPrice = $state<number>(100);
  let floorPrice = $state<number>(10);

  const handleCreateAuction = () => {
    if (!$selectedLand || !selectedToken) {
      console.error('selected land is not available');
      return;
    }
    //TODO change the params
    landStore
      ?.auctionLand(
        $selectedLand.location,
        startPrice,
        floorPrice,
        selectedToken?.address,
        2,
      )
      .then((res) => {
        console.log('Auction created:', res);
      });
  };
</script>

<div class="flex h-full items-stretch p-2">
  <LandOverview data={$selectedLandMeta} />
  <div class="flex flex-1 justify-center items-center">
    <p>EMPTY LAND</p>
  </div>
</div>
