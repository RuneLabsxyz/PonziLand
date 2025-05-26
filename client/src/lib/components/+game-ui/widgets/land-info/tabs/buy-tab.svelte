<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import type { TabType } from '$lib/interfaces';
  import BuyInsights from '../buy/buy-insights.svelte';
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
  let stake: string = $state('');
  let sellPrice: string = $state('');

  let selectedToken = $derived(
    data.availableTokens.find((token) => token.address === tokenValue),
  );
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
  </div>
{/if}
