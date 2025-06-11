<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { writable } from 'svelte/store';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { landStore } from '$lib/stores/store.svelte';
  import type { CairoCustomEnum } from 'starknet';
  import { level } from '$lib/models.gen';

  let { land }: { land: LandWithActions } = $props();

  let accountManager = useAccount();
  let disabled = writable(false);
  let priceIncrease = $state(land ? land.sellPrice.toString() : '0');
  let touched = $state(false);

  let priceError = $derived.by(() => {
    if (!land || !priceIncrease) return null;

    try {
      const newPrice = CurrencyAmount.fromScaled(priceIncrease, land.token);
      if (newPrice.rawValue().isLessThanOrEqualTo(land.sellPrice.rawValue())) {
        return 'New price must be higher than the current price';
      }
      return null;
    } catch {
      return 'Invalid price value';
    }
  });

  let isPriceValid = $derived(() => !!land && !!priceIncrease && !priceError);

  const handleIncreasePrice = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }
    let newPrice = CurrencyAmount.fromScaled(priceIncrease, land.token);
    let result = await land.increasePrice(newPrice);
    disabled.set(true);
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();
      await Promise.any([txPromise, landPromise]);

      const parsedEntity = {
        entityId: land.location, // Assuming land has an id property
        models: {
          ponzi_land: {
            Land: {
              ...land,
              sell_price: newPrice.toBignumberish(), // Update the sell price
              // @ts-ignore
              level: (land.level === 1
                ? 'Zero'
                : land.level === 2
                  ? 'First'
                  : 'Second') as CairoCustomEnum, // Ensure level is correctly set
            },
          },
        },
      };
      landStore.updateLand(parsedEntity); // Update the land in the store

      disabled.set(false);
    }
  };
</script>

<div class="flex flex-col gap-4 w-full">
  <div class="space-y-3">
    <Label>Enter the new price</Label>
    <Input
      type="number"
      bind:value={priceIncrease}
      placeholder="New Price"
      on:input={() => (touched = true)}
    />
    {#if touched && priceError}
      <p class="text-red-500 text-sm">{priceError}</p>
    {/if}
    <Button
      disabled={$disabled || !isPriceValid}
      onclick={handleIncreasePrice}
      class="w-full"
    >
      Confirm Price
    </Button>
  </div>
</div>
