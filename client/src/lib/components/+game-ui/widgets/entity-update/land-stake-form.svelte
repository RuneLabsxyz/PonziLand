<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { LandStake } from '$lib/models.gen';
  import { onMount } from 'svelte';
  import { preventDefault } from 'svelte/legacy';

  let { onSubmit, loading = false } = $props<{
    onSubmit: (stake: Partial<LandStake>) => void;
    loading?: boolean;
  }>();

  let amount = $state('');
  let tokenUsed = $state(''); // Keep this for UI but don't submit it

  function handleSubmit() {
    const stake: Partial<LandStake> = {};

    if (amount) stake.amount = amount;

    onSubmit(stake);
  }
</script>

<form onsubmit={preventDefault(handleSubmit)} class="space-y-4">
  <div>
    <Label>Amount</Label>
    <Input
      type="number"
      bind:value={amount}
      placeholder="1000000"
      disabled={loading}
    />
  </div>
  <Button type="submit" class="w-full" disabled={loading}>
    {#if loading}
      Updating...
    {:else}
      Update Land Stake
    {/if}
  </Button>
</form>
