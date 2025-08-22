<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Tween } from 'svelte/motion';
  import { gameSounds } from '$lib/stores/sfx.svelte';
  import { claimQueue as globalClaimQueue } from '$lib/stores/claim.svelte';
  import { execute, simultaneously, wait } from '$lib/utils/animation';

  let { amount, token }: { amount: bigint; token: Token } = $props<{
    amount: bigint;
    token: Token;
  }>();

  let isAnimating = $state(false);
  let increment = $state(0);
  let startingAmount = $state(0n); // Track the starting amount when processing begins
  let accumulatedIncrements = $state(0n); // Track total increments during processing

  let claimQueue = $derived(globalClaimQueue.get(token.address));

  let tweenAmount = Tween.of(() => Number(amount), {
    delay: 500,
    duration: 500,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  let isProcessingAnimation = $state(false);

  const processQueue = async () => {
    // We go under the principle that there is an amount here.
    // We pop the event
    const event = claimQueue?.next();

    if (!event) return;

    const increment = event.toBigint();
    accumulatedIncrements += increment;

    isAnimating = true;

    await simultaneously(
      tweenAmount.set(Number(startingAmount + accumulatedIncrements)),

      execute(() => gameSounds.play('coin1'), {
        repetitions: 10,
        delay: 60,
      }),
    );

    await wait(250);

    // Stop animation
    isAnimating = false;

    await wait(750);

    // Restart animation for next event
    if (claimQueue?.current == undefined) {
      isProcessingAnimation = false;
      startingAmount = amount;
      accumulatedIncrements = 0n;
    } else {
      // Continue processing the queue
      processQueue();
    }
  };

  $effect(() => {
    const nextEvent = claimQueue?.next;

    if (nextEvent) {
      // We have a claim event here!
      isProcessingAnimation = true;
      // Set starting amount when we begin processing
      startingAmount = amount;
      accumulatedIncrements = 0n;

      setTimeout(processQueue, 500);
    }
  });

  $effect(() => {
    const hasEvents = claimQueue?.current !== undefined;

    if (hasEvents && !isProcessingAnimation) {
      if (startingAmount === 0n) {
        startingAmount = amount;
        accumulatedIncrements = 0n;
      }
      processQueue();
    }
  });

  // Derived value for display
  let displayAmount = $derived(
    CurrencyAmount.fromUnscaled(BigInt(tweenAmount.current), token),
  );
</script>

<div class="flex flex-1 items-center justify-between text-xl tracking-wide">
  <div
    class="gap-1 flex font-ds opacity-75 text-[#6BD5DD]{isAnimating
      ? 'animating scale-110 text-yellow-500 font-bold'
      : ''}"
  >
    <div>{displayAmount}</div>
    <div class="relative">
      {#if isAnimating}
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
