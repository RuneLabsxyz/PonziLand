<script lang="ts">
  import TokenAvatar from '../token-avatar/token-avatar.svelte';
  import { walletStore, getBaseToken } from '$lib/stores/wallet.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import {
    displayCurrency,
    formatWithoutExponential,
  } from '$lib/utils/currency';
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
    oninput,
  }: {
    value1?: string;
    value2?: string;
    token1?: Token;
    token2?: Token;
    placeholder1?: string;
    placeholder2?: string;
    disabled?: boolean;
    class?: string;
    oninput?: () => void;
  } = $props();

  let baseToken = $derived(getBaseToken());
  let displayToken2 = $derived(token2 || baseToken);

  // State to prevent infinite loops
  let isUpdatingFromValue1 = $state(false);
  let isUpdatingFromValue2 = $state(false);

  // Percentage adjustment options
  const percentages = [0.5, 1, 5, 10, 25, 50];

  // Function to adjust value1 by percentage
  function adjustValue1(percentage: number, isAddition: boolean) {
    if (!value1 || !token1 || !displayToken2) return;

    try {
      const currentValue = parseFloat(value1);
      if (isNaN(currentValue)) return;

      const adjustment = currentValue * (percentage / 100);
      const newValue = isAddition
        ? currentValue + adjustment
        : currentValue - adjustment;

      // Ensure value doesn't go negative
      const finalValue = Math.max(0, newValue);

      value1 = finalValue.toString();
      oninput?.();

      // Trigger conversion to update value2
      isUpdatingFromValue1 = true;

      const amount1 = CurrencyAmount.fromScaled(value1, token1);
      const convertedAmount = walletStore.convertTokenAmount(
        amount1,
        token1,
        displayToken2,
      );

      value2 = convertedAmount
        ? displayCurrency(convertedAmount.rawValue().toString())
        : '';

      isUpdatingFromValue1 = false;
    } catch (error) {
      console.error('Error adjusting value1:', error);
    }
  }

  // Update value2 when value1 changes using token conversion
  function updateValue2FromValue1(event: Event) {
    if (isUpdatingFromValue2) return;

    const target = event.target as HTMLInputElement;
    value1 = target.value;
    oninput?.();

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
        ? displayCurrency(convertedAmount.rawValue().toString())
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
    oninput?.();

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
        ? displayCurrency(convertedAmount.rawValue())
        : '';
    } catch (error) {
      console.error('Error updating value1 from value2:', error);
      value1 = '';
    } finally {
      isUpdatingFromValue2 = false;
    }
  }
</script>

<div class={`flex flex-col items-center mt-2 ${className}`}>
  <!-- Percentage adjustment buttons -->
  <div class="flex flex-col items-end">
    <div class="flex gap-1 tracking-widest font-ponzi-number items-center">
      <span class="flex opacity-80 text-white">
        <span>$</span>
        <input
          class="bg-transparent w-32"
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
          class="bg-transparent w-32"
          value={value1}
          oninput={updateValue2FromValue1}
          placeholder={placeholder1}
          {disabled}
        />
      </span>
      <span class="text-gray-500">{token1?.symbol}</span>
    </div>
  </div>
  <div class="flex gap-2 mb-2 justify-end">
    <!-- Minus buttons (left side) -->
    <div class="flex flex-row-reverse gap-0.5">
      {#each percentages as percentage}
        <button
          type="button"
          class="px-1.5 py-0.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded transition-colors"
          onclick={() => adjustValue1(percentage, false)}
          disabled={disabled || !value1 || parseFloat(value1) <= 0}
        >
          -{percentage}%
        </button>
      {/each}
    </div>

    <!-- Plus buttons (right side) -->
    <div class="flex gap-0.5">
      {#each percentages as percentage}
        <button
          type="button"
          class="px-1.5 py-0.5 text-xs bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded transition-colors"
          onclick={() => adjustValue1(percentage, true)}
          disabled={disabled || !value1}
        >
          +{percentage}%
        </button>
      {/each}
    </div>
  </div>
</div>
