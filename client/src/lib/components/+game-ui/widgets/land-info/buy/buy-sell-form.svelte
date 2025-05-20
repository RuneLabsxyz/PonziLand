<script lang="ts">
  import type { LandWithActions } from '$lib/api/land.svelte';
  import type { Token } from '$lib/interfaces';
  import { tokenStore } from '$lib/stores/tokens.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import { Input } from '$lib/components/ui/input';
  import Label from '$lib/components/ui/label/label.svelte';
  import { Select, SelectContent } from '$lib/components/ui/select';
  import SelectItem from '$lib/components/ui/select/select-item.svelte';
  import SelectTrigger from '$lib/components/ui/select/select-trigger.svelte';
  import BuyInsights from './buy-insights.svelte';

  let {
    selectedToken = $bindable<Token | undefined>(),
    stakeAmount = $bindable<CurrencyAmount>(),
    sellAmount = $bindable<CurrencyAmount>(),
    land,
  }: {
    selectedToken: Token | undefined;
    stakeAmount: CurrencyAmount;
    sellAmount: CurrencyAmount;
    land: LandWithActions;
  } = $props();

  let stakeAmountVal = $state(stakeAmount.toString());
  let sellAmountVal = $state(sellAmount.toString());
  let error = $state<string | null>(null);

  const validateForm = () => {
    error = null;

    if (!selectedToken) {
      error = 'Please select a token';
      return false;
    }

    let parsedStake = parseFloat(stakeAmountVal);
    let parsedSell = parseFloat(sellAmountVal);

    if (isNaN(parsedStake) || parsedStake <= 0) {
      error = 'Stake amount must be a number greater than 0';
      return false;
    }

    if (isNaN(parsedSell) || parsedSell <= 0) {
      error = 'Sell price must be a number greater than 0';
      return false;
    }

    // get selected token balance from tokenStore balance
    const selectedTokenBalance = tokenStore.balances.find(
      (balance) => balance.token.address == selectedToken?.address,
    );

    if (!selectedTokenBalance) {
      error = "You don't have any of this token";
      return false;
    }

    const selectedTokenAmount = CurrencyAmount.fromUnscaled(
      selectedTokenBalance?.balance,
      selectedToken,
    );

    // Check if the land's current price is affordable
    if (
      land.sellPrice &&
      selectedTokenAmount.rawValue().isLessThan(land.sellPrice.rawValue())
    ) {
      error = `This land is too expensive. Current price: ${land.sellPrice.toString()} ${land.token.symbol}. Your balance: ${selectedTokenAmount.toString()} ${selectedToken.symbol}`;
      return false;
    }

    // Check if the total amount (stake + sell) is affordable
    const totalRequired = parsedStake + parsedSell;
    if (selectedTokenAmount.rawValue().isLessThan(totalRequired)) {
      error = `Insufficient balance. You need ${totalRequired} ${selectedToken.symbol} (stake: ${parsedStake}, price: ${parsedSell}). Your balance: ${selectedTokenAmount.toString()} ${selectedToken.symbol}`;
      return false;
    }

    return true;
  };

  $effect(() => {
    // Validate form whenever values change
    validateForm();
  });

  $effect(() => {
    if (selectedToken == undefined) {
      selectedToken = data.availableTokens.find((t) => t.symbol == 'eSTRK');
    }
  });

  $effect(() => {
    stakeAmount = CurrencyAmount.fromScaled(stakeAmountVal);
  });

  $effect(() => {
    stakeAmount = CurrencyAmount.fromScaled(stakeAmountVal);
    sellAmount = CurrencyAmount.fromScaled(sellAmountVal);
  });
</script>

<div class="w-full flex flex-col gap-2 text-stroke-none">
  <Label class="text-lg font-semibold">Select Token</Label>
  <Select onSelectedChange={(v) => (selectedToken = v?.value as Token)}>
    <SelectTrigger>
      {#if selectedToken}
        <div class="flex gap-2 items-center">
          <img
            class="h-4 w-4"
            src={selectedToken.images.icon}
            alt={selectedToken.symbol}
          />
          {selectedToken.symbol} -
          {selectedToken.name}
        </div>
      {:else}
        Select Token
      {/if}
    </SelectTrigger>
    <SelectContent>
      {#each data.availableTokens as token}
        <SelectItem value={token}>
          <div class="flex gap-2 items-center">
            <img class="h-4 w-4" src={token.images.icon} alt={token.symbol} />
            {token.symbol} -
            {token.name}
          </div>
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
  <button
    class="flex items-center gap-2 my-2 text-lg text-[#1F75BC] hover:opacity-75 disabled:opacity-50"
    disabled
  >
    <div class="w-6 h-6 bg-[#1F75BC] relative">
      <div
        class="w-4 h-1 bg-white absolute left-1/2 top-1/2"
        style="transform: translate(-50%, -50%);"
      ></div>
      <div
        class="w-4 h-1 bg-white absolute left-1/2 top-1/2"
        style="transform: translate(-50%, -50%) rotate(-90deg); transform-origin: 50% 50%;"
      ></div>
    </div>
    Add Token Manually ◭ coming soon ◭
  </button>
  <div class="flex gap-2">
    <div>
      <Label class="text-lg font-semibold">Stake Amount</Label>
      <Input
        type="number"
        bind:value={stakeAmountVal}
        class={error ? 'border-red-500 border-2' : ''}
      />
    </div>
    <div>
      <Label class="text-lg font-semibold">Sell Price</Label>
      <Input
        type="number"
        bind:value={sellAmountVal}
        class={error ? 'border-red-500 border-2' : ''}
      />
    </div>
  </div>

  {#if error}
    <div
      class="text-red-500 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded"
    >
      {error}
    </div>
  {/if}

  {#if land}
    <BuyInsights {sellAmountVal} {stakeAmountVal} {selectedToken} {land} />
  {/if}
</div>
