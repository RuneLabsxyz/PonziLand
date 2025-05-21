<script lang="ts">
  import SwapModal from '$lib/components/swap/swap-modal.svelte';
  import type { Token } from '$lib/interfaces';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { tokenStore } from '$lib/stores/tokens.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Tween } from 'svelte/motion';
  import data from '$profileData';
  import { padAddress } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';

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

  let showSwap = $state(false);
  let animating = $state(false);
  let increment = $state(0);

  let tweenAmount = Tween.of(() => Number(amount), {
    delay: 500,
    duration: 500,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  const localQueue: CurrencyAmount[] = [];
  let processing = $state(false);

  const processQueue = () => {
    const nextEvent = localQueue[0];
    increment = Number(nextEvent.toBigint());
    animating = true;
    tweenAmount.set(Number(nextEvent.toBigint() + amount)).then(() => {
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
        }
      }, 750);
    });
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
          processQueue();
        }

        // remove from global queue
        claimQueue.update((queue) => queue.slice(1));
      }
    });

    return () => {
      unsub();
    };
  });
</script>

<div class="flex gap-2 justify-end w-full text-stroke-none">
  <div class="flex flex-col items-end">
    <div class="flex gap-2 items-center justify-end w-full">
      <div class="flex text-right justify-end w-full relative overflow-hidden">
        {#if animating}
          <span class="ml-3 absolute left-0 top-0 animate-in-out-left">
            +{CurrencyAmount.fromUnscaled(increment, token)}
          </span>
        {/if}
        <span class=" {animating ? 'animating text-green-500' : ''}">
          {CurrencyAmount.fromUnscaled(tweenAmount.current, token)}
        </span>
      </div>
      <div class="font-bold text-right">
        {token.symbol}
      </div>
    </div>
    <span class=" text-gray-500">
      {baseTokenValue.toString()}
      {data.mainCurrency}
    </span>
  </div>
  <button
    class="text-[10px] opacity-75 h-fit mt-1"
    onclick={() => (showSwap = true)}
  >
    SWAP
  </button>
</div>

{#if showSwap}
  <SwapModal sellToken={token} bind:visible={showSwap} />
{/if}

<style>
  @keyframes scale-down {
    from {
      transform: scale(1.05);
    }
    to {
      transform: scale(1);
    }
  }

  .animating {
    transform: scale(1.05);
    animation: scale-down 0.3s ease-in-out 1000ms forwards;
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
