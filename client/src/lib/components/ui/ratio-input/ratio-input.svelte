<script lang="ts">
  import TokenAvatar from '../token-avatar/token-avatar.svelte';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { formatWithoutExponential } from '$lib/utils/currency';
  import type { Token } from '$lib/interfaces';

  let {
    value1 = $bindable(''),
    value2 = $bindable(''),
    token1,
    token2,
    placeholder1 = '0.00',
    placeholder2 = '0.00',
    disabled = false,
    class: className = '',
  }: {
    value1?: string;
    value2?: string;
    token1?: Token;
    token2?: Token;
    placeholder1?: string;
    placeholder2?: string;
    disabled?: boolean;
    class?: string;
  } = $props();

  let baseToken = $derived(getBaseToken());
  let displayToken2 = $derived(token2 || baseToken);

  // State to prevent infinite loops
  let isUpdatingFromValue1 = $state(false);
  let isUpdatingFromValue2 = $state(false);

  // Update value2 when value1 changes using token conversion
  function updateValue2FromValue1(event: Event) {
    if (isUpdatingFromValue2) return;

    const target = event.target as HTMLInputElement;
    value1 = target.value;

    isUpdatingFromValue1 = true;

    try {
      if (!value1 || !token1 || !displayToken2) {
        value2 = '';
        return;
      }

      const amount1 = CurrencyAmount.fromScaled(value1, token1);
      const convertedAmount = walletStore.convertTokenAmount(
        amount1,
        token1,
        displayToken2,
      );

      value2 = convertedAmount
        ? formatWithoutExponential(convertedAmount.rawValue().toString(), 3)
        : '';
    } catch (error) {
      console.error('Error updating value2 from value1:', error);
      value2 = '';
    } finally {
      isUpdatingFromValue1 = false;
    }
  }

  // Update value1 when value2 changes using token conversion
  function updateValue1FromValue2(event: Event) {
    if (isUpdatingFromValue1) return;

    const target = event.target as HTMLInputElement;
    value2 = target.value;

    isUpdatingFromValue2 = true;

    try {
      if (!value2 || !displayToken2 || !token1) {
        value1 = '';
        return;
      }

      const amount2 = CurrencyAmount.fromScaled(value2, displayToken2);
      const convertedAmount = walletStore.convertTokenAmount(
        amount2,
        displayToken2,
        token1,
      );

      value1 = convertedAmount
        ? formatWithoutExponential(convertedAmount.rawValue().toString(), 3)
        : '';
    } catch (error) {
      console.error('Error updating value1 from value2:', error);
      value1 = '';
    } finally {
      isUpdatingFromValue2 = false;
    }
  }
</script>

<div class={`flex flex-col items-end mt-2 ${className}`}>
  <div class="flex gap-1 tracking-widest font-ponzi-number items-center">
    <span class="flex opacity-80 text-white">
      <span>$</span>
      <input
        class="bg-transparent"
        value={value2}
        oninput={updateValue1FromValue2}
        placeholder={placeholder2}
        {disabled}
      />
    </span>
    <span><TokenAvatar token={displayToken2} /></span>
  </div>

  <div class="flex items-center gap-1 leading-none text-lg">
    <span class="text-gray-400">
      <input
        class="bg-transparent"
        value={value1}
        oninput={updateValue2FromValue1}
        placeholder={placeholder1}
        {disabled}
      />
    </span>
    <span class="text-gray-500">{token1?.symbol}</span>
  </div>
</div>
