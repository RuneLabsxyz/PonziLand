<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { LandStake } from '$lib/models.gen';
  import { padAddress } from '$lib/utils';

  let { onSubmit, loading = false } = $props<{
    onSubmit: (stake: Partial<LandStake>) => void;
    loading?: boolean;
  }>();

  let owner = $state('');
  let amount = $state('');
  let tokenUsed = $state('');
  let blockDateBought = $state('');

  function handleSubmit() {
    const stake: Partial<LandStake> = {};
    
    if (owner) stake.owner = padAddress(owner);
    if (amount) stake.amount = amount;
    if (tokenUsed) stake.token_used = tokenUsed;
    if (blockDateBought) stake.block_date_bought = blockDateBought;

    onSubmit(stake);
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  <div>
    <Label>Owner Address</Label>
    <Input bind:value={owner} placeholder="0x..." />
  </div>
  <div>
    <Label>Amount</Label>
    <Input type="number" bind:value={amount} placeholder="1000000" />
  </div>
  <div>
    <Label>Token Used</Label>
    <Input bind:value={tokenUsed} placeholder="0x..." />
  </div>
  <div>
    <Label>Block Date Bought</Label>
    <Input type="number" bind:value={blockDateBought} placeholder="1234567890" />
  </div>
  <Button type="submit" class="w-full" disabled={loading}>
    {#if loading}
      Updating...
    {:else}
      Update Land Stake
    {/if}
  </Button>
</form> 