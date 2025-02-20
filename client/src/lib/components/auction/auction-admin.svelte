<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { Button } from '../ui/button';
  import { Input } from '../ui/input';
  import { Label } from '../ui/label';
  import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from '../ui/select';
  import data from '$lib/data.json';
  import { goto } from '$app/navigation';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let landStore = useLands();

  let location = $state<number>(0);
  let startPrice = $state<string>('100');
  let stopPrice = $state<string>('10');
  let decayRate = $state<number>(2);

  const handleCreateAuction = () => {
    console.log('Creating Auction');
    //TODO change the params
    landStore
      ?.auctionLand(
        location,
        CurrencyAmount.fromScaled(startPrice, data.availableTokens[0]),
        CurrencyAmount.fromScaled(stopPrice, data.availableTokens[0]),
        decayRate,
      )
      .then((res) => {
        console.log('Auction created:', res);
      });
  };
</script>

<div class="text-ponzi p-8">
  <Button onclick={() => goto('/game')}>Back to game</Button>
  <Label>Location</Label>
  <Input bind:value={location} type="number" />
  <Label>Start Price</Label>
  <Input type="number" bind:value={startPrice} />
  <Label>Stop Price</Label>
  <Input type="number" bind:value={stopPrice} />
  <Label>Decay Rate</Label>
  <Input type="number" bind:value={decayRate} />
  <Button on:click={handleCreateAuction}>Create Auction</Button>
</div>
