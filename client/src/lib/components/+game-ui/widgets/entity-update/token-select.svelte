<script lang="ts">
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
  import { tokenStore } from '$lib/stores/tokens.store.svelte';
  import type { Token } from '$lib/interfaces';
  import { Label } from '$lib/components/ui/label';

  let { value = $bindable<string>(), disabled = false } = $props<{
    value?: string;
    disabled?: boolean;
  }>();

  let selectedToken = $derived(
    tokenStore.balances.find((tb) => tb.token.address === value)?.token
  );

  function handleTokenChange(v: { value: Token } | undefined) {
    value = v?.value.address;
  }
</script>

<div>
  <Label>Token Used</Label>
  <Select 
    value={selectedToken} 
    onSelectedChange={handleTokenChange}
    disabled={disabled}
  >
    <SelectTrigger class="w-full">
      {#if selectedToken}
        <div class="flex gap-2 items-center">
          <img class="h-4 w-4" src={selectedToken.images.icon} alt={selectedToken.symbol} />
          {selectedToken.symbol}
        </div>
      {:else}
        <span>Select Token</span>
      {/if}
    </SelectTrigger>
    <SelectContent>
      {#each tokenStore.balances as { token } }
        <SelectItem value={token}>
          <div class="flex gap-2 items-center">
            <img class="h-4 w-4" src={token.images.icon} alt={token.symbol} />
            {token.symbol}
          </div>
        </SelectItem>
      {/each}
    </SelectContent>
  </Select>
</div> 