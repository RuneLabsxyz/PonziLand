<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { tokenStore } from '$lib/stores/tokens.store.svelte';
  import { padAddress } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Tween } from 'svelte/motion';
  import data from '$profileData';
  import { coinbit } from '@reown/appkit/networks';
  import { gameSounds } from '$lib/stores/sfx.svelte';

  let { amount, token }: { amount: bigint; token: Token } = $props<{
    amount: bigint;
    token: Token;
  }>();

  let tokenPrice = $derived(
    tokenStore.prices.find((p) => {
      return padAddress(p.address) === padAddress(token.address);
    }),
  );
  let baseTokenValue = $derived.by(() => {
    const rawValue = tokenPrice?.ratio
      ? CurrencyAmount.fromUnscaled(amount, token)
          .rawValue()
          .dividedBy(tokenPrice.ratio)
      : CurrencyAmount.fromUnscaled(amount, token).rawValue();

    const cleanedValue = displayCurrency(rawValue);
    return cleanedValue;
  });

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
</script>

<div class="flex flex-1 items-center justify-between text-xl tracking-wide">
  <div
    class="gap-1 flex font-ds opacity-75 text-[#6BD5DD]{animating
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
  <div class="font-ds opacity-75 text-[#D9D9D9]">
    {token.symbol}
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

  .animating {
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
