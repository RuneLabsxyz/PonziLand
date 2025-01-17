<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { selectedLand } from '$lib/stores/stores.svelte';
  import BuySellForm from '../buy/buy-sell-form.svelte';
  import { Button } from '../ui/button';

  const landStore = useLands();

  let selectedToken = $state<Token | null>(null);
  let stakeAmount = $state<number>(100);
  let sellAmount = $state<number>(10);

  const handleCreateAuction = () => {
    if (!$selectedLand || !selectedToken) {
      console.error('selected land is not available');
      return;
    }
    //TODO change the params
    landStore
      ?.auctionLand(
        $selectedLand.location,
        stakeAmount,
        sellAmount,
        selectedToken?.address,
        2,
      )
      .then((res) => {
        console.log('Auction created:', res);
      });
  };
</script>

<BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />

<Button on:click={handleCreateAuction}>Create Auction</Button>
