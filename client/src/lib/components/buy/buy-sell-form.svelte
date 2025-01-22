<script lang="ts">
  import data from '$lib/data.json';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Input } from '../ui/input';
  import Label from '../ui/label/label.svelte';
  import { Select, SelectContent, SelectValue } from '../ui/select';
  import SelectItem from '../ui/select/select-item.svelte';
  import SelectTrigger from '../ui/select/select-trigger.svelte';

  let {
    selectedToken = $bindable<Token | undefined>(),
    stakeAmount = $bindable<CurrencyAmount>(),
    sellAmount = $bindable<CurrencyAmount>(),
  }: {
    selectedToken: Token | undefined;
    stakeAmount: CurrencyAmount;
    sellAmount: CurrencyAmount;
  } = $props();

  let stakeAmountVal = $state(stakeAmount.toString());
  let sellAmountVal = $state(sellAmount.toString());

  $effect(() => {
    stakeAmount = CurrencyAmount.fromScaled(stakeAmountVal);
  });

  $effect(() => {
    sellAmount = CurrencyAmount.fromScaled(sellAmountVal);
  });
</script>

<div class="w-full flex flex-col gap-2">
  Buy Sell Form
  <Label>Token</Label>
  <Select onSelectedChange={(v) => (selectedToken = v?.value as Token)}>
    <SelectTrigger class="w-[180px]">
      <SelectValue placeholder="Token" />
    </SelectTrigger>
    <SelectContent>
      {#each data.availableTokens as token}
        <SelectItem value={token}>{token.name}</SelectItem>
      {/each}
    </SelectContent>
  </Select>
  <Label>Stake Amount</Label>
  <Input type="number" bind:value={stakeAmountVal} />
  <Label>Sell Price</Label>
  <Input type="number" bind:value={sellAmountVal} />
</div>
