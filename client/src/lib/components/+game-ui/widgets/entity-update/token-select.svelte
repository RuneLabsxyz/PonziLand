<script lang="ts">
  import TokenSelect from '$lib/components/ui/token/token-select.svelte';
  import { tokenStore } from '$lib/stores/tokens.svelte';
  import { Label } from '$lib/components/ui/label';
  import type { Token } from '$lib/interfaces';

  let {
    value = $bindable<string>(),
    disabled = false,
    id = 'token-select',
  } = $props<{
    value?: string;
    disabled?: boolean;
    id?: string;
  }>();

  // Extract tokens from tokenStore.balances
  let availableTokens = $derived(tokenStore.balances.map((tb) => tb.token));

  // Handle the unified component's value which returns Token but we need string
  let internalValue = $state<Token | string | undefined>(value);

  // Sync external value changes to internal
  $effect(() => {
    internalValue = value;
  });

  // Sync internal value changes to external (convert Token to string address)
  $effect(() => {
    if (typeof internalValue === 'object' && internalValue?.address) {
      value = internalValue.address;
    } else if (typeof internalValue === 'string') {
      value = internalValue;
    }
  });
</script>

<div>
  <Label for={id}>Token Used</Label>
  <TokenSelect
    bind:value={internalValue}
    tokens={availableTokens}
    {disabled}
    {id}
  />
</div>
