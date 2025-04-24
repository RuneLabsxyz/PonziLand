<script lang="ts">
  import type { SelectedLand } from '$lib/stores/stores.svelte';
  import { selectedLandMeta } from '$lib/stores/stores.svelte';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { onMount } from 'svelte';
  import BuyInsights from '../buy/buy-insights.svelte';
  import Button from '../ui/button/button.svelte';
  import { Card } from '../ui/card';
  import CardTitle from '../ui/card/card-title.svelte';
  import CloseButton from '../ui/close-button.svelte';
  import Input from '../ui/input/input.svelte';
  import Label from '../ui/label/label.svelte';
  import LandOverview from './land-overview.svelte';
  import LandHudInfo from './hud/land-hud-info.svelte';

  const handleCancel = () => {
    uiStore.showModal = false;
  };

  let land: SelectedLand = $state();
  let stakeIncrease = $state('100');

  let stakeAfter = $derived.by(() => {
    if (!land) return -1;
    const total =
      Number(stakeIncrease) + land.stakeAmount.rawValue().toNumber();
    return total;
  });

  const handleIncreaseStake = () => {
    console.log('Increase stake', stakeIncrease);

    $selectedLandMeta
      ?.increaseStake(
        CurrencyAmount.fromScaled(stakeIncrease, $selectedLandMeta.token),
      )
      .then((res) => console.log('increase success', res));
  };

  onMount(() => {
    land = $selectedLandMeta;
  });
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 text-stroke-none"
>
  <Card class="flex flex-col relative">
    <CloseButton
      onclick={handleCancel}
      className="absolute top-0 right-0 m-2"
    />
    <CardTitle class="mt-2 mb-3">Land Info</CardTitle>
    {#if land}
      <div class="flex h-full w-full">
        <div class="flex flex-col w-full items-center justify-center min-w-80">
          <LandOverview {land} isOwner={true} size="lg" />
          <div class="flex items-center gap-2 mt-6">
            <div class="text-3xl text-ponzi-number text-white">
              {land?.token?.symbol}
            </div>
            <img
              class="w-6 h-6 rounded-full"
              src={land?.token?.images.icon}
              alt="{land?.token?.symbol} icon"
            />
          </div>
        </div>
        <div class="flex flex-col gap-2 text-stroke-none w-96">
          <Card>
            <div class="flex items-center justify-center">
              <LandHudInfo {land} isOwner={false} showLand={false} />
            </div>
          </Card>
          <Label class="font-bold">Stake Increase</Label>
          <Input class="w-full" bind:value={stakeIncrease} />
          <Button onclick={handleIncreaseStake}>Increase stake</Button>

          <BuyInsights
            {land}
            selectedToken={land.token}
            sellAmountVal={land.sellPrice.toString()}
            stakeAmountVal={stakeAfter.toString()}
          />
        </div>
      </div>
    {/if}
  </Card>
</div>
