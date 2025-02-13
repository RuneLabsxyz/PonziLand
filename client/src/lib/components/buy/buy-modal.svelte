<script lang="ts">
  import { useLands, type LandSetup } from '$lib/api/land.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Token } from '$lib/interfaces';
  import { uiStore, selectedLandMeta } from '$lib/stores/stores.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { toCalldata } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import LandOverview from '../land/land-overview.svelte';
  import LoadingScreen from '../loading/loading-screen.svelte';
  import Button from '../ui/button/button.svelte';
  import { CardTitle } from '../ui/card';
  import Card from '../ui/card/card.svelte';
  import CloseButton from '../ui/close-button.svelte';
  import BuySellForm from './buy-sell-form.svelte';
  import ThreeDots from '../loading/three-dots.svelte';
  import TokenDisplay from '../ui/token-display/token-display.svelte';

  import * as Avatar from '$lib/components/ui/avatar/index.js';

  let landStore = useLands();
  let accountManager = useAccount();

  let selectedToken = $state<Token | undefined>();
  let loading = $state(false);

  let stakeAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(1));
  let sellAmount = $state<CurrencyAmount>(CurrencyAmount.fromScaled(1));

  $effect(() => {
    // Update the token while preserving the scaled amount
    stakeAmount.setToken(selectedToken ?? undefined);
    sellAmount.setToken(selectedToken ?? undefined);
  });

  let priceDisplay = $derived($selectedLandMeta?.sellPrice.toString() ?? '');

  function handleCancelClick() {
    uiStore.showModal = false;
    uiStore.modalData = null;
  }

  async function handleBuyClick() {
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

    loading = true;

    try {
      const result = await landStore?.buyLand(
        $selectedLandMeta?.location,
        landSetup,
      );

      if (result?.transaction_hash) {
        await accountManager
          ?.getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);

        console.log('Bought land with TX: ', result.transaction_hash);

        // Close the modal
        uiStore.showModal = false;
        uiStore.modalData = null;
      }
    } catch (error) {
      console.error('Error buying land', error);
    } finally {
      loading = false;
    }
  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col">
    <CloseButton onclick={handleCancelClick} />
    <CardTitle>Buy Land</CardTitle>
    <div class="flex h-full w-full">
      <div class="flex flex-col w-full items-center justify-center min-w-80">
        {#if $selectedLandMeta}
          <LandOverview land={$selectedLandMeta} size="lg" />

          <div class="flex items-center gap-1 pt-5">
            {#each priceDisplay as char}
              {#if char === '.'}
                <div class="text-ponzi-huge text-3xl">.</div>
              {:else}
                <div
                  class="text-ponzi-huge text-3xl bg-[#2B2B3D] p-2 text-[#f2b545]"
                >
                  {char}
                </div>
              {/if}
            {/each}
          </div>
          <div class="text-ponzi-huge text-3xl mt-2"></div>
          <div class="flex items-center gap-2">
            <div class="text-3xl text-ponzi-huge text-white">
              {$selectedLandMeta?.token?.symbol}
            </div>
            <img
              class="w-6 h-6 rounded-full"
              src={$selectedLandMeta?.token?.images.icon}
              alt="{$selectedLandMeta?.token?.symbol} icon"
            />
          </div>
        {/if}
      </div>
      <div class="min-w-80">
        <BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount />
      </div>
    </div>
    <div class="flex justify-center mt-5">
      {#if loading}
        <div class="text-3xl h-10 w-20">
          Buying<ThreeDots />
        </div>
      {:else}
        <Button
          on:click={() => {
            handleBuyClick();
          }}>Buy land</Button
        >
      {/if}
    </div>
  </Card>
</div>
