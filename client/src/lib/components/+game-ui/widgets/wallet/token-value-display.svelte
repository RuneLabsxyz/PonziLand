<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { cn } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';

  let { amount, token }: { amount: bigint; token: Token } = $props<{
    amount: bigint;
    token: Token;
  }>();

  // Reset tween when balance updates externally
  $effect(() => {
    amount;
    token;

    untrack(() => {
      tweenAmount.set(Number(amount), { duration: 0 });
      startingAmount = amount;
      accumulatedIncrements = 0n;
      increment = 0n;
    });
  });

  let animating = $state(false);
  let increment = $state(0n);
  let startingAmount = $state(0n); // Track the starting amount when processing begins
  let accumulatedIncrements = $state(0n); // Track total increments during processing
  let previousBaseEquivalent = $state<CurrencyAmount | null>(null); // Track previous base equivalent for animation

  let tweenAmount = Tween.of(() => Number(amount), {
    delay: 500,
    duration: 500,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const localQueue: CurrencyAmount[] = [];
  let processing = $state(false);

  // Method 1: Using setInterval with counter
  function soundAtInterval(nbLands: number) {
    let count = 0;

    const intervalId = setInterval(() => {
      count++;
      gameSounds.play('coin1');

      if (count >= nbLands) {
        clearInterval(intervalId);
      }
    }, 60);
  }

  const processQueue = () => {
    const nextEvent = localQueue[0];
    const nextIncrement = nextEvent.toBigint();

    increment = nextIncrement;
    accumulatedIncrements += nextIncrement;

    // Store current base equivalent before animation for comparison
    previousBaseEquivalent = baseEquivalent;
    animating = true;

    tweenAmount.set(Number(startingAmount + accumulatedIncrements)).then(() => {
      setTimeout(() => {
        animating = false;
        // remove from local queue
        localQueue.shift();
      }, 250);
      setTimeout(() => {
        // Test if should restart
        if (localQueue.length > 0) {
          processQueue();
        } else {
          processing = false;
          // Reset tracking when done processing
          startingAmount = amount;
          accumulatedIncrements = 0n;
        }
      }, 750);
    });
    soundAtInterval(10);
  };

  $effect(() => {
    const unsub = claimQueue.subscribe((queue) => {
      const nextEvent = queue[0];

      if (nextEvent?.getToken()?.address == token.address) {
        // add to local queue
        localQueue.push(nextEvent);
        // trigger updates
        if (processing == false) {
          processing = true;
          // Set starting amount when we begin processing
          startingAmount = amount;
          accumulatedIncrements = 0n;
          setTimeout(processQueue, 500);
        }

        // remove from global queue
        claimQueue.update((queue) => queue.slice(1));
      }
    });

    return () => {
      unsub();
    };
  });

  // Derived value for display
  let displayAmount = $derived(
    CurrencyAmount.fromUnscaled(BigInt(Math.round(tweenAmount.current)), token),
  );

  // Get USDC as the fixed base token
  const baseToken = $derived.by(() => {
    // Always use USDC as base token
    const usdcAddress =
      '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
    return data.availableTokens.find((t) => t.address === usdcAddress);
  });

  // Check if current token is the selected base token
  const isBaseToken = $derived(
    baseToken && token.address === baseToken.address,
  );

  // Derive the equivalent amount in base token
  const baseEquivalent = $derived.by(() => {
    if (isBaseToken || !baseToken) return null;
    return walletStore.convertTokenAmount(displayAmount, token, baseToken);
  });

  $effect(() => {
    if (baseEquivalent) {
      previousBaseEquivalent = baseEquivalent;
    }
  });

  // Determine which display mode to use
  const displayMode = $derived(settingsStore.walletDisplayMode);
  const shouldShowBaseValue = $derived(!isBaseToken && displayMode === 'base');

  // Calculate increment in base token for animation
  const baseIncrement = $derived.by(() => {
    if (!animating || increment === 0n || !baseToken || isBaseToken)
      return null;

    const incrementAmount = CurrencyAmount.fromUnscaled(increment, token);
    return walletStore.convertTokenAmount(incrementAmount, token, baseToken);
  });

  // Get conversion rate for display
  const conversionRate = $derived.by(() => {
    if (isBaseToken || !baseToken) return null;

    // Get the original mainnet base token for price calculations
    const originalBaseToken = data.availableTokens.find(
      (t) => t.address === data.mainCurrencyAddress,
    );
    if (!originalBaseToken) return null;

    if (shouldShowBaseValue) {
      // When showing base values primarily, show: 1 SELECTED_BASE = X TOKEN
      // Need to convert through the original base token
      const oneSelectedBase = CurrencyAmount.fromScaled(1, baseToken);
      const oneSelectedBaseInOriginalBase = walletStore.convertTokenAmount(
        oneSelectedBase,
        baseToken,
        originalBaseToken,
      );
      if (!oneSelectedBaseInOriginalBase) return null;

      // Now convert from original base to the target token
      const rateInToken = walletStore.convertTokenAmount(
        oneSelectedBaseInOriginalBase,
        originalBaseToken,
        token,
      );
      return rateInToken;
    } else {
      // When showing token values primarily, show: 1 TOKEN = X SELECTED_BASE
      const oneToken = CurrencyAmount.fromScaled(1, token);
      const rateInSelectedBase = walletStore.convertTokenAmount(
        oneToken,
        token,
        baseToken,
      );
      return rateInSelectedBase;
    }
  });

  const hasToken = $derived(tweenAmount.current !== 0);
</script>

<!-- Phantom wallet style: Avatar + Token Name on top, Token Amount + Symbol below, Base Token Value on right -->
<div class="flex items-center justify-between w-full">
  <!-- Left side: Token info -->
  <div class="flex flex-col">
    <!-- Token Name -->
    <div
      class={cn([
        'font-ds font-medium leading-tight',
        hasToken ? 'text-white' : 'text-gray-400',
      ])}
    >
      {token.name || token.symbol}
    </div>
    <!-- Token Amount + Symbol with animation -->
    <div
      class={cn([
        'gap-1 flex font-ds opacity-75 leading-tight',
        animating ? 'animating text-yellow-500 font-bold' : '',
        hasToken ? 'text-[#6BD5DD]' : 'text-[#165b60]',
      ])}
    >
      <div>{displayAmount}</div>
      <div class={hasToken ? 'text-gray-400' : 'text-gray-600'}>
        {token.symbol}
      </div>
      <div class="relative">
        {#if animating && increment > 0n}
          <span
            class="absolute left-0 animate-in-out-left text-yellow-500 whitespace-nowrap"
          >
            +{CurrencyAmount.fromUnscaled(increment, token).toString()}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Right side: Base token value -->
  <div class="flex flex-col items-end text-right text-lg">
    <div class="flex items-center">
      {#if animating && baseIncrement}
        <span
          class="animate-in-out-right text-yellow-500 pr-2 whitespace-nowrap"
        >
          +{baseIncrement.toString()}
        </span>
      {/if}
      <div
        class={cn({
          'flex items-center font-ds leading-tight': true,
          'text-gray-400': !hasToken,
          'text-white': hasToken,
          'text-yellow-500 font-bold': animating && baseToken,
        })}
      >
        {#if baseEquivalent}
          <span class="text-lg">$ </span>{baseEquivalent.toString()}
        {:else if isBaseToken}
          <span class="text-lg">$ </span>{displayAmount.toString()}
        {/if}
      </div>
    </div>
    {#if conversionRate}
      <div class="text-xs opacity-50 font-ds text-gray-400 leading-tight">
        1 {token.symbol} = {conversionRate.toString()} $
      </div>
    {/if}
  </div>
</div>

<style>
  @keyframes scale-down {
    from {
      transform: scale(1.2);
    }
    to {
      transform: scale(1);
    }
  }

  @keyframes slideInOutLeft {
    0% {
      transform: translateX(-100%);
      opacity: 0;
    }
    10% {
      transform: translateX(0);
      opacity: 1;
    }
    90% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(-100%);
      opacity: 0;
    }
  }

  @keyframes slideInOutRight {
    0% {
      transform: translateX(100%);
      opacity: 0;
    }
    10% {
      transform: translateX(0);
      opacity: 1;
    }
    90% {
      transform: translateX(0);
      opacity: 1;
    }
    100% {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  .animate-in-out-left {
    animation: slideInOutLeft 1250ms ease-in-out forwards;
  }

  .animate-in-out-right {
    animation: slideInOutRight 1250ms ease-in-out forwards;
  }
</style>
