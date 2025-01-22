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
  let selectedToken = $state<Token | null>(null);
  let startPrice = $state<string>('100');
  let stopPrice = $state<string>('10');
  let decayRate = $state<number>(2);

  const handleCreateAuction = () => {
    console.log('Creating Auction');
    //TODO change the params
    landStore
      ?.auctionLand(
        location,
        CurrencyAmount.fromScaled(startPrice, selectedToken ?? undefined),
        CurrencyAmount.fromScaled(stopPrice, selectedToken ?? undefined),
        selectedToken?.address!,
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
  <Label>Token</Label>
  <Select onSelectedChange={(v) => (selectedToken = v?.value as Token)}>
    <SelectTrigger class="w-[180px]">
      <SelectValue placeholder="Token" />
    </SelectTrigger>
    <SelectContent>
      {#each data.availableTokens as token}
        <SelectItem value={token}>{token.name}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
  <Label>Start Price</Label>
  <Input type="number" bind:value={startPrice} />
  <Label>Stop Price</Label>
  <Input type="number" bind:value={stopPrice} />
  <Label>Decay Rate</Label>
  <Input type="number" bind:value={decayRate} />
  <Button on:click={handleCreateAuction}>Create Auction</Button>
</div>
