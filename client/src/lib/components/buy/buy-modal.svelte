<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import LandOverview from '../land/land-overview.svelte';
  import Button from '../ui/button/button.svelte';
  import { CardTitle } from '../ui/card';
  import Card from '../ui/card/card.svelte';
  import BuySellForm from './buy-sell-form.svelte';
  import data from '$lib/data.json';
  import { useLands, type LandSetup } from '$lib/api/land.svelte';
  import { toHexWithPadding } from '$lib/utils';

  let { onCancel, data: propData } = $props();

  let landStore = useLands();

  let selectedToken = $state<Token | null>(null);
  let stakeAmount = $state<number>(0);
  let sellAmount = $state<number>(0);

  function handleCancelClick() {
    onCancel();
  }

  function handleBuyClick() {
    console.log('Buy land');

    const landSetup: LandSetup = {
      tokenForSaleAddress: selectedToken?.address || '',
      salePrice: toHexWithPadding(sellAmount),
      amountToStake: toHexWithPadding(stakeAmount),
      liquidityPoolAddress: selectedToken?.lpAddress || '',
    }

    landStore?.buyLand(propData.location, landSetup).then(res => {
      console.log('Land bought:', res);
    });

  }
</script>

<div
  class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
>
  <Card class="flex flex-col min-w-96 h-96">
    <CardTitle>Buy Land</CardTitle>
    <div class="flex h-full">
        <LandOverview data={propData} />
        <BuySellForm bind:selectedToken bind:stakeAmount bind:sellAmount/>
    </div>
    <div class="flex justify-center">
        <Button variant="secondary" on:click={() => {handleBuyClick()}}>Buy land</Button>
    </div>
  </Card>
</div>
