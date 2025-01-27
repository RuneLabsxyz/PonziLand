<script lang="ts">
  import { page } from '$app/stores';
  import { useLands } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { selectedLand, selectedLandMeta } from '$lib/stores/stores.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Button } from '../../ui/button';
  import { Input } from '../../ui/input';
  import { Label } from '../../ui/label';
  import LandOverview from '../land-overview.svelte';
  import data from '$lib/data.json';

  const landStore = useLands();

  let selectedToken = $state<Token | null>(null);
  let startPrice = $state<string>('0.01');
  let floorPrice = $state<string>('0.001');

  let decayRate = $state<number>(2);

  const handleCreateAuction = () => {
    const selectedToken = data.availableTokens.find(
      (token) => token.symbol === 'eLORDS',
    );

    if (!$selectedLand) {
      console.error('selected land is not available');
      return;
    }

    if (!selectedToken) {
      console.error('selected token is not available');
      return;
    }

    //TODO change the params
    landStore
      ?.auctionLand(
        $selectedLand.location,
        CurrencyAmount.fromScaled(startPrice, selectedToken),
        CurrencyAmount.fromScaled(floorPrice, selectedToken),
        decayRate,
      )
      .then((res) => {
        console.log('Auction created:', res);
      });
  };
</script>

<div class="flex h-full items-stretch p-2">
  {#if $selectedLandMeta}
    <LandOverview land={$selectedLandMeta} />
  {/if}
  <div
    class="flex flex-1 justify-center items-center text-2xl text-shadow-none opacity-50"
  >
    <p>EMPTY LAND</p>
  </div>
  {#if $page.data.isAdmin}
    <div class="flex flex-col">
      <Label>Start Price</Label>
      <Input type="number" bind:value={startPrice} />
      <Label>Floor Price</Label>
      <Input type="number" bind:value={floorPrice} />
      <Label>Decay Rate</Label>
      <Input type="number" bind:value={decayRate} />
      <Button on:click={handleCreateAuction}>Create Auction</Button>
    </div>
  {/if}
</div>
