<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import type { CairoCustomEnum } from 'starknet';

  let { land }: { land: LandWithActions } = $props();

  let accountManager = useAccount();
  let priceIncrease = $state(land ? land.sellPrice.toString() : '0');
  let touched = $state(false);
  let isLoading = $state(false);

  let priceError = $derived.by(() => {
    if (!land || !priceIncrease) return null;

    const newPrice = CurrencyAmount.fromScaled(priceIncrease, land.token);
    const currentPrice = land.sellPrice;

    if (newPrice.rawValue().isLessThanOrEqualTo(currentPrice.rawValue())) {
      return `New price must be higher than current price (${currentPrice.toString()})`;
    }
    return null;
  });

  let isPriceValid = $derived.by(() => {
    if (!land || !priceIncrease) return false;

    const newPrice = CurrencyAmount.fromScaled(priceIncrease, land.token);
    const isValid = newPrice
      .rawValue()
      .isGreaterThan(land.sellPrice.rawValue());
    return isValid;
  });

  const handleIncreasePrice = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }
    isLoading = true;
    try {
      let newPrice = CurrencyAmount.fromScaled(priceIncrease, land.token);
      let result = await land.increasePrice(newPrice);
      if (result?.transaction_hash) {
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();
        await Promise.any([txPromise, landPromise]);

        const parsedEntity = {
          entityId: land.location,
          models: {
            ponzi_land: {
              Land: {
                ...land,
                sell_price: newPrice.toBignumberish(),
                // @ts-ignore
                level: (land.level === 1
                  ? 'Zero'
                  : land.level === 2
                    ? 'First'
                    : 'Second') as CairoCustomEnum,
              },
            },
          },
        };
        landStore.updateLand(parsedEntity);
      }
    } catch (error) {
      console.error('Error increasing price:', error);
    } finally {
      isLoading = false;
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
      disabled={isLoading}
    />
    {#if touched && priceError}
      <p class="text-red-500 text-sm">{priceError}</p>
    {/if}
    <Button
      disabled={!isPriceValid || isLoading}
      onclick={handleIncreasePrice}
      class="w-full"
    >
      {#if isLoading}
        Processing&nbsp;<ThreeDots />
      {:else}
        Confirm Price
      {/if}
    </Button>
  </div>
</div>
