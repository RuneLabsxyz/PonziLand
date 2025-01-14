<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import data from '$lib/data.json';
  import type { Token } from '$lib/interfaces';
  import { selectedLand } from '$lib/stores/stores.svelte';
  import BuySellForm from '../buy/buy-sell-form.svelte';
  import { Button } from '../ui/button';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '../ui/select';

  const landStore = useLands();

  let selectedToken = $state<Token | null>(null);
  let stakeAmount = $state<number>(0);
  let sellAmount = $state<number>(0);

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
      )
      .then((res) => {
        console.log('Auction created:', res);
      });
  };
</script>

<BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />

<Button on:click={handleCreateAuction}>Create Auction</Button>
