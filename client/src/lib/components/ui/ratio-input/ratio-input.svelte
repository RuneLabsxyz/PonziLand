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
    onadjust,
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
    onadjust?: () => void;
  } = $props();

  let baseToken = $derived(getBaseToken());
  let displayToken2 = $derived(token2 || baseToken);

  // State to prevent infinite loops
  let isUpdatingFromValue1 = $state(false);
  let isUpdatingFromValue2 = $state(false);

  // Track which input is being edited to show plain numbers vs formatted display
  let isEditingValue1 = $state(false);
  let isEditingValue2 = $state(false);

  // Store the raw values for editing
  let editValue1 = $state('');
  let editValue2 = $state('');

  // Display values - formatted when not editing, plain when editing
  let displayValue1 = $derived(isEditingValue1 ? editValue1 : (value1 ? displayCurrency(value1.replace(/[,$\s]/g, '')) : ''));
  let displayValue2 = $derived(isEditingValue2 ? editValue2 : (value2 ? displayCurrency(value2.replace(/[,$\s]/g, '')) : ''));

  // Percentage adjustment options
  const percentages = [0.5, 1, 5, 10, 25, 50];

  // Function to adjust value1 by percentage
  function adjustValue1(percentage: number, isAddition: boolean) {
    if (!value1 || !token1 || !displayToken2) return;

    try {
      // Remove formatting and commas to get raw number
      const cleanValue1 = value1.replace(/[,$\s]/g, '');
      const currentValue = parseFloat(cleanValue1);
      if (isNaN(currentValue)) return;

      const adjustment = currentValue * (percentage / 100);
      const newValue = isAddition
        ? currentValue + adjustment
        : currentValue - adjustment;

      // Ensure value doesn't go negative
      const finalValue = Math.max(0, newValue);

      value1 = finalValue.toString();
      oninput?.();
      onadjust?.();

      // Trigger conversion to update value2
      isUpdatingFromValue1 = true;

      const amount1 = CurrencyAmount.fromScaled(finalValue.toString(), token1);
      const convertedAmount = walletStore.convertTokenAmount(
        amount1,
        token1,
        displayToken2,
      );

      const convertedValue = convertedAmount?.rawValue().toString() || '';
      value2 = convertedValue;

      isUpdatingFromValue1 = false;
    } catch (error) {
      console.error('Error adjusting value1:', error);
    }
  }

  // Handle focus on value1 input - switch to edit mode
  function handleFocusValue1() {
    isEditingValue1 = true;
    const cleanValue = value1.replace(/[,$\s]/g, '');
    editValue1 = cleanValue;
  }

  // Handle blur on value1 input - switch back to display mode
  function handleBlurValue1(event: Event) {
    isEditingValue1 = false;
    const target = event.target as HTMLInputElement;
    value1 = target.value;
    editValue1 = '';
  }

  // Update value2 when value1 changes using token conversion
  function updateValue2FromValue1(event: Event) {
    if (isUpdatingFromValue2) return;

    const target = event.target as HTMLInputElement;
    
    if (isEditingValue1) {
      editValue1 = target.value;
    }
    
    value1 = target.value;
    oninput?.();

    isUpdatingFromValue1 = true;

    try {
      if (!value1 || !token1 || !displayToken2) {
        value2 = '';
        if (isEditingValue2) editValue2 = '';
        return;
      }

      // Remove formatting to get clean number for calculations
      const cleanValue1 = value1.replace(/[,$\s]/g, '');
      const amount1 = CurrencyAmount.fromScaled(cleanValue1, token1);
      const convertedAmount = walletStore.convertTokenAmount(
        amount1,
        token1,
        displayToken2,
      );

      const convertedValue = convertedAmount?.rawValue().toString() || '';
      value2 = convertedValue;
      if (isEditingValue2) {
        editValue2 = convertedValue;
      }
    } catch (error) {
      console.error('Error updating value2 from value1:', error);
      value2 = '';
      if (isEditingValue2) editValue2 = '';
    } finally {
      isUpdatingFromValue1 = false;
    }
  }

  // Handle focus on value2 input - switch to edit mode
  function handleFocusValue2() {
    isEditingValue2 = true;
    const cleanValue = value2.replace(/[,$\s]/g, '');
    editValue2 = cleanValue;
  }

  // Handle blur on value2 input - switch back to display mode
  function handleBlurValue2(event: Event) {
    isEditingValue2 = false;
    const target = event.target as HTMLInputElement;
    value2 = target.value;
    editValue2 = '';
  }

  // Update value1 when value2 changes using token conversion
  function updateValue1FromValue2(event: Event) {
    if (isUpdatingFromValue1) return;

    const target = event.target as HTMLInputElement;
    
    if (isEditingValue2) {
      editValue2 = target.value;
    }
    
    value2 = target.value;
    oninput?.();

    isUpdatingFromValue2 = true;

    try {
      if (!value2 || !displayToken2 || !token1) {
        value1 = '';
        if (isEditingValue1) editValue1 = '';
        return;
      }

      // Remove formatting to get clean number for calculations
      const cleanValue2 = value2.replace(/[,$\s]/g, '');
      const amount2 = CurrencyAmount.fromScaled(cleanValue2, displayToken2);
      const convertedAmount = walletStore.convertTokenAmount(
        amount2,
        displayToken2,
        token1,
      );

      const convertedValue = convertedAmount?.rawValue().toString() || '';
      value1 = convertedValue;
      if (isEditingValue1) {
        editValue1 = convertedValue;
      }
    } catch (error) {
      console.error('Error updating value1 from value2:', error);
      value1 = '';
      if (isEditingValue1) editValue1 = '';
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
          value={displayValue2}
          oninput={updateValue1FromValue2}
          onfocus={handleFocusValue2}
          onblur={handleBlurValue2}
          placeholder={placeholder2}
          {disabled}
        />
      </span>
      <span><TokenAvatar token={token1} /></span>
    </div>

    <div class="flex items-center gap-1 leading-none text-lg">
      <span class="text-gray-400">
        <input
          class="bg-transparent w-32"
          value={displayValue1}
          oninput={updateValue2FromValue1}
          onfocus={handleFocusValue1}
          onblur={handleBlurValue1}
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
