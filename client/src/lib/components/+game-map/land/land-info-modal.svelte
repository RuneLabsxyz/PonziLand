<script lang="ts">
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import BuyInsights from '../buy/buy-insights.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { Card } from '$lib/components/ui/card';
  import CardTitle from '$lib/components/ui/card/card-title.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import Label from '$lib/components/ui/label/label.svelte';
  import LandHudInfo from './hud/land-hud-info.svelte';
  import LandOverview from './land-overview.svelte';

  let { land } = $props<{ land: SelectedLand }>();
  let accountManager = useAccount();
  let disabled = writable(false);
  let actionType = $state('stake'); // 'stake' or 'price'
  let stakeIncrease = $state('100');
  let priceIncrease = $state('0');

  onMount(() => {
    if (land?.sellPrice) {
      priceIncrease = land.sellPrice.toString();
    }
  });

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

  let isPriceValid = $derived.by(
    () => !!land && !!priceIncrease && !priceError,
  );

  let stakeAfter = $derived.by(() => {
    if (!land) return -1;
    const total =
      Number(stakeIncrease) + land.stakeAmount.rawValue().toNumber();
    return total;
  });

  const handleIncreaseStake = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }

    let result = await land.increaseStake(
      CurrencyAmount.fromScaled(stakeIncrease, land.token),
    );
    disabled.set(true);
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();

      await Promise.any([txPromise, landPromise]);
      disabled.set(false);
    }
  };

  const handleIncreasePrice = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }

    let result = await land.increasePrice(
      CurrencyAmount.fromScaled(priceIncrease, land.token),
    );
    disabled.set(true);
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();

      await Promise.any([txPromise, landPromise]);
      disabled.set(false);
    }
  };
</script>

<Card class="flex flex-col relative">
  <CardTitle class="mt-2 mb-3">Land Info</CardTitle>
  {#if land}
    <div class="flex h-full w-full">
      <div class="flex flex-col w-full items-center justify-center min-w-80">
        <LandOverview {land} isOwner={true} size="lg" />
        <div class="flex items-center gap-2 mt-6">
          <div class="text-3xl text-ponzi-number text-white">
            {land.token?.symbol}
          </div>
          <img
            class="w-6 h-6 rounded-full"
            src={land.token?.images.icon}
            alt="{land.token?.symbol} icon"
          />
        </div>
      </div>
      <div class="flex flex-col gap-2 text-stroke-none w-96">
        <Card>
          <div class="flex items-center justify-center">
            <LandHudInfo {land} isOwner={false} showLand={false} />
          </div>
        </Card>

        <div class="flex-1">
          <div class="flex border-b mb-4">
            <button
              class={`flex-1 py-2 text-center font-medium transition-all duration-200 border-b-2 
    ${actionType === 'stake' ? 'text-white border-white' : 'text-gray-400 border-transparent'}`}
              onclick={() => (actionType = 'stake')}
            >
              Increase Stake
            </button>
            <button
              class={`flex-1 py-2 text-center font-medium transition-all duration-200 border-b-2 
    ${actionType === 'price' ? 'text-white border-white' : 'text-gray-400 border-transparent'}`}
              onclick={() => (actionType = 'price')}
            >
              Increase Price
            </button>
          </div>
          {#if actionType === 'stake'}
            <div class="space-y-3">
              <Label>Amount to add to stake</Label>
              <Input
                type="number"
                bind:value={stakeIncrease}
                placeholder="Enter amount"
              />
              <Button
                disabled={$disabled}
                onclick={handleIncreaseStake}
                class="w-full"
              >
                Confirm Stake
              </Button>
            </div>
          {:else}
            <div class="space-y-3">
              <Label>Enter the new price</Label>
              <Input
                type="number"
                bind:value={priceIncrease}
                placeholder="Enter amount"
              />
              <Button
                disabled={$disabled || !isPriceValid}
                onclick={handleIncreasePrice}
                class="w-full"
              >
                Confirm Price
              </Button>
            </div>
          {/if}
        </div>
        <BuyInsights {land} selectedToken={land.token} />
      </div>
    </div>
  {/if}
</Card>
