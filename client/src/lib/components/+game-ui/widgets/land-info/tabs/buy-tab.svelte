<script lang="ts">
  import type { LandSetup, LandWithActions } from '$lib/api/land';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { TabType } from '$lib/interfaces';
  import { buyLand } from '$lib/stores/store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import TaxImpact from '../tax-impact/tax-impact.svelte';

  let {
    land,
    activeTab = $bindable(),
    isActive = false,
  }: {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
  } = $props();

  let tokenValue: string = $state('');
  let selectedToken = $derived(
    data.availableTokens.find((token) => token.address === tokenValue),
  );
  let stake: string = $state('');
  let stakeAmount: CurrencyAmount = $derived(
    CurrencyAmount.fromScaled(stake, selectedToken),
  );
  let sellPrice: string = $state('');
  let sellPriceAmount: CurrencyAmount = $derived(
    CurrencyAmount.fromScaled(sellPrice, selectedToken),
  );
  let loading = $state(false);

  let accountManager = useAccount();

  async function handleBuyClick() {
    console.log('Buy land');

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: stakeAmount,
      amountToStake: sellPriceAmount,
      tokenAddress: land?.tokenAddress ?? '',
      currentPrice: land?.sellPrice ?? null,
    };

    if (!land) {
      console.error('No land selected');
      return;
    }

    loading = true;

    try {
      // const result = await landStore?.buyLand(land?.location, landSetup);
      const result = await buyLand(land.location, landSetup);

      if (result?.transaction_hash) {
        // Only wait for the land update, not the total TX confirmation (should be fine)
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();

        await Promise.any([txPromise, landPromise]);

        console.log('Bought land with TX: ', result.transaction_hash);
      }
    } catch (error) {
      console.error('Error buying land', error);
    } finally {
      loading = false;
    }
  }
</script>

{#if isActive}
  <div class="w-full h-full">
    <!-- Buy tab content will go here -->
    <Label class="font-ponzi-number" for="token">Token</Label>
    <p class="-mt-1 mb-1 opacity-75 leading-none">
      Determines the land you are going to build. You stake this token and will
      receive this token when bought
    </p>
    <TokenSelect bind:value={tokenValue} />
    <div class="flex gap-2 items-center my-4">
      <div class="flex-1">
        <Label class="font-ponzi-number" for="stake">Stake Amount</Label>
        <p class="-mt-1 mb-1 leading-none opacity-75">
          Locked value that will be used to pay taxes and make your land survive
        </p>
        <Input id="stake" type="number" bind:value={stake} />
      </div>
      <div class="flex-1">
        <Label class="font-ponzi-number" for="sell">Sell Price</Label>
        <p class="-mt-1 mb-1 opacity-75 leading-none">
          What is paid to you when your land is bought out by another player
        </p>
        <Input id="sell" type="number" bind:value={sellPrice} />
      </div>
    </div>
    <TaxImpact
      sellAmountVal={sellPrice}
      stakeAmountVal={stake}
      {selectedToken}
      {land}
    />
    {#if loading}
      <Button class="mt-3 w-full" disabled>
        buying <ThreeDots />
      </Button>
    {:else}
      <Button onclick={handleBuyClick} class="mt-3 w-full">
        BUY FOR<span class="text-yellow-500">&nbsp;{land.sellPrice}&nbsp;</span>
        {land.token?.symbol}
      </Button>
    {/if}
  </div>
{/if}
