<script lang="ts">
  import { useLands, type LandSetup } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { uiStore, selectedLandMeta } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { toCalldata } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import LandOverview from '../land/land-overview.svelte';
  import Button from '../ui/button/button.svelte';
  import { CardTitle } from '../ui/card';
  import Card from '../ui/card/card.svelte';
  import CloseButton from '../ui/close-button.svelte';
  import BuySellForm from './buy-sell-form.svelte';

  let landStore = useLands();

  let selectedToken = $state<Token | undefined>();

  let stakeAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(1));
  let sellAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(1));

  $effect(() => {
    // Update the token while preserving the scaled amount
    stakeAmount.setToken(selectedToken ?? undefined);
    sellAmount.setToken(selectedToken ?? undefined);
  });

  function handleCancelClick() {
    uiStore.showModal = false;
    uiStore.modalData = null;
  }

  function handleBuyClick() {
    console.log('Buy land');

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: sellAmount,
      amountToStake: stakeAmount,
      liquidityPoolAddress: selectedToken?.lpAddress ?? '',
      tokenAddress: $selectedLandMeta?.tokenAddress ?? '',
      currentPrice: $selectedLandMeta?.sellPrice ?? null,
    };

    if (!$selectedLandMeta) {
      console.error('No land selected');
      return;
    }

    landStore?.buyLand($selectedLandMeta?.location, landSetup).then((res) => {
      console.log('Land bought:', res);
    });
  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col min-w-96 h-96">
    <CloseButton onclick={handleCancelClick} />
    <CardTitle>Buy Land</CardTitle>
    <div class="flex h-full">
      <div class="flex flex-col w-full items-center justify-center">
        {#if $selectedLandMeta}
          <LandOverview land={$selectedLandMeta} />
        {/if}
      </div>
      <BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />
    </div>
    <div class="flex justify-center">
      <Button
        on:click={() => {
          handleBuyClick();
        }}>Buy land</Button
      >
    </div>
  </Card>
</div>
