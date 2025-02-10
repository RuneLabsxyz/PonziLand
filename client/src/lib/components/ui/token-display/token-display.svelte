<script lang="ts">
  import SwapModal from '$lib/components/swap/swap-modal.svelte';
  import type { Token } from '$lib/interfaces';
  import { claimQueue } from '$lib/stores/event.store.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { Tween } from 'svelte/motion';

  let { amount, token }: { amount: bigint; token: Token } = $props<{
    amount: bigint;
    token: Token;
  }>();

  let showSwap = $state(false);
  let animating = $state(false);
  let increment = $state(0);

  let tweenAmount = Tween.of(() => Number(amount), {
    delay: 500,
    duration: 500,
    easing: (t) => 1 - Math.pow(1 - t, 3),
  });

  $effect(() => {
    const unsub = claimQueue.subscribe((queue) => {
      console.log('queue', queue);
      const nextEvent = queue[0];

      if (nextEvent?.getToken()?.address == token.address) {
        console.log('token is the same', token.symbol);
        console.log('setting amount to', nextEvent.toBigint());

        increment = Number(nextEvent.toBigint());
        animating = true;
        tweenAmount.set(Number(nextEvent.toBigint() + amount)).then(() => {
          setTimeout(() => {
            animating = false;
          }, 250);
        });

        claimQueue.update((queue) => queue.slice(1));
      }
    });

    return () => {
      unsub();
    };
  });
</script>

<div class="flex gap-2 items-center justify-end w-full">
  <div class="flex text-right justify-end w-full relative overflow-hidden">
    {#if animating}
      <span class="ml-3 absolute left-0 top-0 animate-in-out-left">
        +{CurrencyAmount.fromUnscaled(increment, token)}
      </span>
    {/if}
    <span class="amount {animating ? 'animating text-green-500' : ''}">
      {CurrencyAmount.fromUnscaled(tweenAmount.current, token)}
    </span>
  </div>
  <div class="font-bold text-right">
    {token.symbol}
  </div>
  <button onclick={() => (showSwap = true)}>Swap</button>
</div>

{#if showSwap}
  <SwapModal sellToken={token} bind:visible={showSwap} />
{/if}

<style>
  .amount {
    text-shadow: none;
  }
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
