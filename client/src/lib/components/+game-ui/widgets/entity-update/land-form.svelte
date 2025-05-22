<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { Land } from '$lib/models.gen';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import { level } from '$lib/models.gen';
  import TokenSelect from './token-select.svelte';
  import { CairoCustomEnum } from 'starknet';
  import { onMount } from 'svelte';

  let { onSubmit, loading = false } = $props<{
    onSubmit: (land: Partial<Land>) => void;
    loading?: boolean;
  }>();

  let owner = $state('0x123');
  let sellPrice = $state('');
  let tokenUsed = $state('');
  let blockDateBought = $state(Date.now().toString());
  let selectedLevel = $state<CairoCustomEnum>(
    new CairoCustomEnum({ [level[0]]: '' }),
  );

  onMount(() => {
    // Set initial values
    owner = '0x123';
    blockDateBought = Date.now().toString();
  });

  function handleSubmit() {
    const land: Partial<Land> = {};

    if (owner) land.owner = padAddress(owner);
    if (sellPrice) land.sell_price = toHexWithPadding(parseInt(sellPrice));
    if (tokenUsed) land.token_used = tokenUsed;
    if (blockDateBought)
      land.block_date_bought = toHexWithPadding(parseInt(blockDateBought));
    land.level = selectedLevel;

    onSubmit(land);
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  <div>
    <Label>Owner Address</Label>
    <Input bind:value={owner} placeholder="0x..." disabled={loading} />
  </div>
  <div>
    <Label>Level</Label>
    <select
      class="w-full rounded-md border border-input bg-background px-3 py-2"
      bind:value={selectedLevel}
      disabled={loading}
      on:change={(e) => {
        const value = e.currentTarget.value;
        selectedLevel = new CairoCustomEnum({ [value]: '' });
      }}
    >
      {#each level as l}
        <option value={l}>{l}</option>
      {/each}
    </select>
  </div>
  <div>
    <Label>Sell Price</Label>
    <Input
      type="number"
      bind:value={sellPrice}
      placeholder="1000000"
      disabled={loading}
    />
  </div>
  <TokenSelect bind:value={tokenUsed} disabled={loading} />
  <div>
    <Label>Block Date Bought</Label>
    <Input
      type="number"
      bind:value={blockDateBought}
      placeholder="1234567890"
      disabled={loading}
    />
  </div>
  <Button type="submit" class="w-full" disabled={loading}>
    {#if loading}
      Updating...
    {:else}
      Update Land
    {/if}
  </Button>
</form>
