<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { LandStake } from '$lib/models.gen';
  import TokenSelect from './token-select.svelte';
  import { onMount } from 'svelte';

  let { onSubmit, loading = false } = $props<{
    onSubmit: (stake: Partial<LandStake>) => void;
    loading?: boolean;
  }>();

  let amount = $state('');
  let lastPayTime = $state(Date.now().toString());
  let tokenUsed = $state(''); // Keep this for UI but don't submit it

  onMount(() => {
    // Set initial last pay time to current timestamp
    lastPayTime = Date.now().toString();
  });

  function handleSubmit() {
    const stake: Partial<LandStake> = {};
    
    if (amount) stake.amount = amount;
    if (lastPayTime) stake.last_pay_time = lastPayTime;

    onSubmit(stake);
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  <div>
    <Label>Amount</Label>
    <Input type="number" bind:value={amount} placeholder="1000000" disabled={loading} />
  </div>
  <div>
    <Label>Last Pay Time</Label>
    <Input type="number" bind:value={lastPayTime} placeholder="1234567890" disabled={loading} />
  </div>
  <Button type="submit" class="w-full" disabled={loading}>
    {#if loading}
      Updating...
    {:else}
      Update Land Stake
    {/if}
  </Button>
</form> 