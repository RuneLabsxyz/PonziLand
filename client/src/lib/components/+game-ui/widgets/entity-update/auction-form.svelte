<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import type { Auction } from '$lib/models.gen';
  import { toHexWithPadding, coordinatesToLocation } from '$lib/utils';

  let { onSubmit, loading = false } = $props<{
    onSubmit: (auction: Partial<Auction>) => void;
    loading?: boolean;
  }>();

  // Default values for an ongoing auction
  let startTime = $state(Math.floor(Date.now() / 1000).toString()); // Current timestamp in seconds
  let startPrice = $state('1000000'); // 1M in base units
  let floorPrice = $state('100000'); // 100K in base units
  let decayRate = $state('100'); // 1% decay rate
  let isFinished = $state(false);
  let x = $state('32');
  let y = $state('32');

  function handleSubmit() {
    const auction: Partial<Auction> = {};
    
    if (startTime) auction.start_time = toHexWithPadding(parseInt(startTime));
    if (startPrice) auction.start_price = toHexWithPadding(parseInt(startPrice));
    if (floorPrice) auction.floor_price = toHexWithPadding(parseInt(floorPrice));
    if (decayRate) auction.decay_rate = toHexWithPadding(parseInt(decayRate));
    auction.is_finished = isFinished;
    if (x && y) {
      const location = coordinatesToLocation({ x: parseInt(x), y: parseInt(y) });
      auction.land_location = toHexWithPadding(location);
    }

    onSubmit(auction);
  }
</script>

<form on:submit|preventDefault={handleSubmit} class="space-y-4">
  <div>
    <Label>Start Time</Label>
    <Input type="number" bind:value={startTime} placeholder="1234567890" disabled={loading} />
  </div>
  <div>
    <Label>Start Price</Label>
    <Input type="number" bind:value={startPrice} placeholder="1000000" disabled={loading} />
  </div>
  <div>
    <Label>Floor Price</Label>
    <Input type="number" bind:value={floorPrice} placeholder="100000" disabled={loading} />
  </div>
  <div>
    <Label>Decay Rate</Label>
    <Input type="number" bind:value={decayRate} placeholder="100" disabled={loading} />
  </div>
  <div class="flex items-center justify-between p-2">
    <button
      type="button"
      class="flex items-center gap-3 px-4 py-2 rounded-lg"
      on:click={() => isFinished = !isFinished}
      disabled={loading}
    >
      <div
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
          {isFinished ? 'bg-orange-500' : 'bg-orange-500/25'}"
      >
        <span class="sr-only">{isFinished ? 'Finished: On' : 'Finished: Off'}</span>
        <span
          class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out
            {isFinished ? 'translate-x-6' : 'translate-x-1'}"
        ></span>
      </div>
      <span class="font-medium">Is Finished</span>
    </button>
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label>Land X Coordinate</Label>
      <Input type="number" bind:value={x} placeholder="32" disabled={loading} />
    </div>
    <div>
      <Label>Land Y Coordinate</Label>
      <Input type="number" bind:value={y} placeholder="32" disabled={loading} />
    </div>
  </div>
  <Button type="submit" class="w-full" disabled={loading}>
    {#if loading}
      Updating...
    {:else}
      Update Auction
    {/if}
  </Button>
</form> 