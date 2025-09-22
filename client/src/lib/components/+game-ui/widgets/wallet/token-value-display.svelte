<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import data from '$profileData';
  import { Tween } from 'svelte/motion';

  let { amount, token }: { amount: bigint; token: Token } = $props<{
    amount: bigint;
    token: Token;
  }>();

  let animating = $state(false);
  let increment = $state(0);
  let startingAmount = $state(0n); // Track the starting amount when processing begins
  let accumulatedIncrements = $state(0n); // Track total increments during processing

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

    increment = Number(nextIncrement);
    accumulatedIncrements += nextIncrement;
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
    CurrencyAmount.fromUnscaled(BigInt(tweenAmount.current), token),
  );

  // Get the currently selected base token
  const baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find((t) => t.address === targetAddress);
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

  // Determine which display mode to use
  const displayMode = $derived(settingsStore.walletDisplayMode);
  const shouldShowBaseValue = $derived(!isBaseToken && displayMode === 'base');

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
</script>

<div class="flex flex-1 items-center justify-between text-xl tracking-wide">
  <div class="flex flex-col flex-1">
    {#if shouldShowBaseValue}
      <div
        class="gap-1 flex font-ds opacity-75 text-[#6BD5DD] leading-none {animating
          ? 'animating scale-110 text-yellow-500 font-bold'
          : ''}"
      >
        <div>{baseEquivalent?.toString() || '0'}</div>
        <div class="relative">
          {#if animating && baseToken}
            <span class="absolute left-0 animate-in-out-left">
              +{walletStore
                .convertTokenAmount(
                  CurrencyAmount.fromUnscaled(increment, token),
                  token,
                  baseToken,
                )
                ?.toString() || '0'}
            </span>
          {/if}
        </div>
      </div>
      <div class="text-sm opacity-50 font-ds text-gray-400 leading-none">
        {displayAmount.toString()}
        {token.symbol}
      </div>
    {:else}
      <div
        class="gap-1 flex font-ds opacity-75 text-[#6BD5DD] leading-none {animating
          ? 'animating scale-110 text-yellow-500 font-bold'
          : ''}"
      >
        <div>{displayAmount}</div>
        <div class="relative">
          {#if animating}
            <span class="absolute left-0 animate-in-out-left">
              +{CurrencyAmount.fromUnscaled(increment, token)}
            </span>
          {/if}
        </div>
      </div>
      {#if !isBaseToken && baseEquivalent && baseToken}
        <div class="text-sm opacity-50 font-ds text-gray-400 leading-none">
          ≈ {baseEquivalent.toString()}
          {baseToken.symbol}
        </div>
      {/if}
    {/if}
  </div>
  <div class="flex flex-col items-end text-right">
    <div class="font-ds opacity-75 text-[#D9D9D9] leading-none">
      {shouldShowBaseValue && baseToken ? baseToken.symbol : token.symbol}
    </div>
    {#if !isBaseToken && conversionRate && baseToken}
      <div class="text-xs opacity-50 font-ds text-gray-400 leading-none">
        {#if shouldShowBaseValue}
          1 {baseToken.symbol} = {conversionRate.toString()} {token.symbol}
        {:else}
          1 {token.symbol} = {conversionRate.toString()} {baseToken.symbol}
        {/if}
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

  :global(.animating) {
    transform: scale(1.2);
    animation: scale-down 1s ease-in-out 1000ms forwards;
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

  .animate-in-out-left {
    animation: slideInOutLeft 1250ms ease-in-out forwards;
  }
</style>
