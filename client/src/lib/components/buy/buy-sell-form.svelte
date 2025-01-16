<script lang="ts">
  import data from '$lib/data.json';
  import type { Token } from '$lib/interfaces';
  import { Input } from '../ui/input';
  import Label from '../ui/label/label.svelte';
  import { Select, SelectContent, SelectValue } from '../ui/select';
  import SelectItem from '../ui/select/select-item.svelte';
  import SelectTrigger from '../ui/select/select-trigger.svelte';

  let {
    selectedToken = $bindable(),
    stakeAmount = $bindable(),
    sellAmount = $bindable(),
  } = $props();
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
  <Input type="number" bind:value={stakeAmount} />
  <Label>Sell Price</Label>
  <Input type="number" bind:value={sellAmount} />
</div>
