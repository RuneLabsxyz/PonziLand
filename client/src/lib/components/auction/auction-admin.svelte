<script lang="ts">
  import { useLands } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import BuySellForm from '../buy/buy-sell-form.svelte';
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

  let landStore = useLands();

  let location = $state<number>(0);
  let selectedToken = $state<Token | null>(null);
  let stakeAmount = $state<number>(100);
  let sellAmount = $state<number>(10);
  let decayRate = $state<number>(2);

  const handleCreateAuction = () => {
    console.log('Creating Auction');
    //TODO change the params
    landStore
      ?.auctionLand(
        location,
        stakeAmount,
        sellAmount,
        selectedToken?.address ?? '',
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
  <Input type="number" bind:value={stakeAmount} />
  <Label>Stop Price</Label>
  <Input type="number" bind:value={sellAmount} />
  <Label>Decay Rate</Label>
  <Input type="number" bind:value={decayRate} />
  <Button on:click={handleCreateAuction}>Create Auction</Button>
</div>
