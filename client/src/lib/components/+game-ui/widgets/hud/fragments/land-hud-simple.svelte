<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import {
    tutorialAttribute,
    markFieldExplored,
    isFieldExplored,
    TUTORIAL_FIELD_DESCRIPTIONS,
  } from '$lib/components/tutorial/stores.svelte';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { getBaseToken, walletStore } from '$lib/stores/wallet.svelte';
  import { displayCurrency } from '$lib/utils/currency';
  import type { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';

  let {
    totalYieldValue,
    burnRate,
    land,
  }: {
    totalYieldValue: number;
    burnRate: CurrencyAmount;
    land: LandWithActions;
  } = $props();
  let baseToken = $derived(getBaseToken());

  // Interactive exploration state
  let isInteractiveMode = $derived(
    tutorialAttribute('interactive_explore').has,
  );
  let hoveredField = $state<string | null>(null);

  function handleFieldHover(fieldId: string) {
    if (isInteractiveMode) {
      hoveredField = fieldId;
      markFieldExplored(fieldId);
    }
  }

  function handleFieldLeave() {
    hoveredField = null;
  }

  function getFieldClass(fieldId: string, baseClass: string) {
    if (!isInteractiveMode) return baseClass;
    const explored = isFieldExplored(fieldId);
    return `${baseClass} tutorial-explorable ${explored ? 'explored' : ''}`;
  }
</script>

<div class="w-full flex flex-col gap-2">
  <div class="flex w-full justify-center select-text">
    <div
      class={getFieldClass(
        'earnings',
        'text-center pb-2 text-ponzi-number relative',
      )}
      class:tutorial-highlight={tutorialAttribute('highlight_info_earnings')
        .has}
      onmouseenter={() => handleFieldHover('earnings')}
      onmouseleave={handleFieldLeave}
      role="button"
      tabindex="0"
    >
      {#if hoveredField === 'earnings' && isInteractiveMode}
        <div class="tutorial-tooltip">
          {TUTORIAL_FIELD_DESCRIPTIONS['earnings']}
        </div>
      {/if}
      <span class="opacity-50">Net earnings / hour:</span>
      <div
        class="{totalYieldValue - Number(burnRate.toString()) >= 0
          ? 'text-green-500'
          : 'text-red-500'} text-2xl flex items-center justify-center gap-2"
      >
        <span class="stroke-3d-black">
          {totalYieldValue - Number(burnRate.toString()) >= 0
            ? '+ '
            : '- '}{displayCurrency(
            Math.abs(totalYieldValue - Number(burnRate.toString())),
          )} $
        </span>
      </div>
    </div>
  </div>
  <div class="flex w-full justify-between select-text">
    <div
      class={getFieldClass(
        'income',
        'flex flex-col items-center text-ponzi-number relative',
      )}
      class:tutorial-highlight={tutorialAttribute('highlight_info_income').has}
      onmouseenter={() => handleFieldHover('income')}
      onmouseleave={handleFieldLeave}
      role="button"
      tabindex="0"
    >
      {#if hoveredField === 'income' && isInteractiveMode}
        <div class="tutorial-tooltip">
          {TUTORIAL_FIELD_DESCRIPTIONS['income']}
        </div>
      {/if}
      <div class="opacity-50 text-sm">Earning / hour :</div>
      <div class="text-green-500 flex items-center gap-2">
        <span class="text-xl stroke-3d-black">
          +&nbsp;{displayCurrency(totalYieldValue)} $
        </span>
      </div>
    </div>
    <div
      class={getFieldClass(
        'outgoing',
        'flex flex-col items-center text-ponzi-number relative',
      )}
      class:tutorial-highlight={tutorialAttribute('highlight_info_outgoing')
        .has}
      onmouseenter={() => handleFieldHover('outgoing')}
      onmouseleave={handleFieldLeave}
      role="button"
      tabindex="0"
    >
      {#if hoveredField === 'outgoing' && isInteractiveMode}
        <div class="tutorial-tooltip">
          {TUTORIAL_FIELD_DESCRIPTIONS['outgoing']}
        </div>
      {/if}
      <div class="opacity-50 text-sm">Cost / hour :</div>
      <div class="text-red-500 flex items-center gap-2">
        <span class="text-xl stroke-3d-black">
          -&nbsp;{displayCurrency(burnRate.rawValue())} $
        </span>
      </div>
    </div>
  </div>
  <div class="flex flex-col text-xl">
    <div
      class={getFieldClass(
        'token',
        'flex justify-between w-full pt-2 leading-none relative',
      )}
      class:tutorial-highlight={tutorialAttribute('highlight_info_token').has}
      onmouseenter={() => handleFieldHover('token')}
      onmouseleave={handleFieldLeave}
      role="button"
      tabindex="0"
    >
      {#if hoveredField === 'token' && isInteractiveMode}
        <div class="tutorial-tooltip">
          {TUTORIAL_FIELD_DESCRIPTIONS['token']}
        </div>
      {/if}
      <div class="low-opacity">Token :</div>
      <div class="text-opacity-30">
        {land?.token?.symbol}
        <TokenAvatar token={land?.token} class="inline-block h-4 w-4 ml-1" />
      </div>
    </div>
    <div
      class={getFieldClass(
        'stake',
        'flex justify-between w-full pt-2 leading-none relative',
      )}
      class:tutorial-highlight={tutorialAttribute('highlight_info_stake').has}
      onmouseenter={() => handleFieldHover('stake')}
      onmouseleave={handleFieldLeave}
      role="button"
      tabindex="0"
    >
      {#if hoveredField === 'stake' && isInteractiveMode}
        <div class="tutorial-tooltip">
          {TUTORIAL_FIELD_DESCRIPTIONS['stake']}
        </div>
      {/if}
      <div class="low-opacity">Stake Amount :</div>
      <div class="text-opacity-30">
        {land?.stakeAmount}
        {land.token?.symbol}

        {#if land.token && baseToken}
          <span class="low-opacity">
            ({walletStore.convertTokenAmount(
              land?.stakeAmount,
              land.token,
              baseToken,
            )} $)
          </span>
        {/if}
      </div>
    </div>
    <div
      class={getFieldClass(
        'sell_price',
        'flex justify-between w-full pt-2 leading-none relative',
      )}
      class:tutorial-highlight={tutorialAttribute('highlight_info_sell_price')
        .has}
      onmouseenter={() => handleFieldHover('sell_price')}
      onmouseleave={handleFieldLeave}
      role="button"
      tabindex="0"
    >
      {#if hoveredField === 'sell_price' && isInteractiveMode}
        <div class="tutorial-tooltip">
          {TUTORIAL_FIELD_DESCRIPTIONS['sell_price']}
        </div>
      {/if}
      <div class="low-opacity">Sell Price :</div>
      <div class="text-opacity-30">
        {land?.sellPrice}
        {land.token?.symbol}

        {#if land.token && baseToken}
          <span class="low-opacity">
            ({walletStore.convertTokenAmount(
              land?.sellPrice,
              land.token,
              baseToken,
            )} $)
          </span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .text-ponzi-number {
    font-family: 'PonziNumber', sans-serif;
  }

  .low-opacity {
    opacity: 0.7;
  }

  .tutorial-highlight {
    border: 2px solid #ffd700;
    border-radius: 8px;
    padding: 0.5rem;
    animation: goldGlow 2s ease-in-out infinite;
  }

  .tutorial-explorable {
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 8px;
    padding: 0.5rem;
    transition: all 0.2s ease;
    overflow: visible;
  }

  .tutorial-explorable:hover {
    border-color: #ffd700;
    background: rgba(255, 215, 0, 0.1);
  }

  .tutorial-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.95);
    color: white;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 1rem;
    font-family: sans-serif;
    max-width: 400px;
    min-width: 280px;
    text-align: center;
    z-index: 9999;
    border: 2px solid #ffd700;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
    margin-bottom: 8px;
    white-space: normal;
    line-height: 1.4;
  }

  .tutorial-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid #ffd700;
  }

  @keyframes goldGlow {
    0%,
    100% {
      box-shadow:
        0 0 8px rgba(255, 215, 0, 0.4),
        0 0 16px rgba(255, 215, 0, 0.2);
    }
    50% {
      box-shadow:
        0 0 16px rgba(255, 215, 0, 0.8),
        0 0 32px rgba(255, 215, 0, 0.4);
    }
  }
</style>
