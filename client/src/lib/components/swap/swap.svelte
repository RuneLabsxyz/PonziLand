<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { Input } from '../ui/input';
  import Label from '../ui/label/label.svelte';

  import { fetchTokenBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';
  import { useAvnu, type QuoteParams } from '$lib/utils/avnu.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { debounce } from '$lib/utils/debounce.svelte';
  import { type Quote } from '@avnu/avnu-sdk';
  import { onMount } from 'svelte';
  import Button from '../ui/button/button.svelte';
  import TokenSelect from './token-select.svelte';
  import { Card } from '../ui/card';

  let { client, accountManager } = useDojo();
  let avnu = useAvnu();
  let {
    sellToken = $bindable(),
    sellAmount = $bindable(),
    buyToken = $bindable(),
    buyAmount = $bindable(),
    onSwap,
  }: {
    sellToken?: Token | undefined;
    buyToken?: Token | undefined;
    onSwap?: () => void;
  } & ( // sellAmount and buyAmount cannot be set at the same time
    | {
        sellAmount: CurrencyAmount;
        buyAmount?: undefined;
      }
    | {
        sellAmount?: undefined;
        buyAmount: CurrencyAmount;
      }
    | {
        sellAmount?: undefined;
        buyAmount?: undefined;
      }
  ) = $props();

  let noRouteAvailable = $state(false);

  onMount(async () => {
    if (accountManager?.getProvider()?.getAccount() == null) {
      console.info('The user is not logged in! Attempting login.');
      await accountManager?.getProvider()?.connect();
    }
  });

  async function getTokenBalance(address?: string) {
    // Only do it on the browser
    if (!address || !accountManager?.getProvider()?.getWalletAccount()) {
      return 0;
    }

    return await fetchTokenBalance(
      address,
      accountManager.getProvider()?.getWalletAccount()!,
      client.provider,
    );
  }

  let sellTokenBalance: CurrencyAmount | undefined = $state();
  $effect(() => {
    sellTokenBalance = undefined;
    if (sellToken) {
      getTokenBalance(sellToken?.address).then((balance) => {
        sellTokenBalance = CurrencyAmount.fromUnscaled(balance ?? 0, sellToken);
      });
    }
  });

  let buyTokenBalance: CurrencyAmount | undefined = $state();
  $effect(() => {
    buyTokenBalance = undefined;
    if (buyToken) {
      getTokenBalance(buyToken?.address).then((balance) => {
        buyTokenBalance = CurrencyAmount.fromUnscaled(balance ?? 0, sellToken);
      });
    }
  });

  function invert() {
    const tmp = sellToken;
    sellToken = buyToken;
    buyToken = tmp;

    const tmpAmount = sellAmountVal;
    sellAmountVal = buyAmountVal;
    buyAmountVal = tmpAmount;
  }

  let leadingSide = $state('sell');

  function setLeadingSide(side: 'sell' | 'buy') {
    leadingSide = side;
  }

  let debouncedInput = debounce(
    () => {
      if (
        !buyToken ||
        !sellToken ||
        (!Number(buyAmountVal) && !Number(sellAmountVal))
      ) {
        return;
      }

      return {
        leadingSide,
        buyToken,
        sellToken,
        buyAmount:
          leadingSide === 'buy'
            ? CurrencyAmount.fromScaled(buyAmountVal)
            : undefined,
        sellAmount:
          leadingSide === 'sell'
            ? CurrencyAmount.fromScaled(sellAmountVal)
            : undefined,
      } as QuoteParams & { leadingSide: 'sell' | 'buy' };
    },
    { delay: 500 },
  );

  let quotes: Quote[] = $state([]);
  $effect(() => {
    const data = debouncedInput.current;
    if (!data) {
      return;
    }
    noRouteAvailable = false;

    // Fetch some quotes
    avnu.fetchQuotes(data).then((q) => {
      quotes = q;
      if (quotes.length == 0) {
        noRouteAvailable = true;
        return;
      }

      if (data.leadingSide == 'buy') {
        sellAmountVal = CurrencyAmount.fromUnscaled(q[0].sellAmount).toString();
      } else {
        buyAmountVal = CurrencyAmount.fromUnscaled(q[0].buyAmount).toString();
      }
    });
  });

  let sellAmountVal = $state(sellAmount?.toString() ?? '0');
  let buyAmountVal = $state(buyAmount?.toString() ?? '0');

  let slippage = $state(0.5);

  async function swap() {
    if (quotes.length == 0) {
      return;
    }

    const quote = quotes[0];
    // Execute swap
    await avnu.executeSwap(quote, { slippage });

    onSwap?.();
  }
</script>

<Label class="font-semibold" for="sellAmount">You sell:</Label>
<div class="flex mt-1 text-stroke-none">
  <Input
    type="number"
    bind:value={sellAmountVal}
    id="sellAmount"
    oninput={() => setLeadingSide('sell')}
  />
  <TokenSelect class="max-w-32" bind:value={sellToken} />
</div>
<div class="mt-2">
  {#if sellTokenBalance != undefined}
    You have <span class="font-bold">{sellTokenBalance}</span>
    {sellToken?.symbol ?? ''}
  {/if}
</div>

<div class="flex w-full justify-center py-3">
  <button onclick={invert} aria-label="Invert">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width="32px"
      height="32px"
      fill="currentColor"
      class="h-5 w-5"
      ><path
        d="M 6 4 L 6 6 L 4 6 L 4 8 L 2 8 L 2 10 L 6 10 L 6 26 L 17 26 L 17 24 L 8 24 L 8 10 L 12 10 L 12 8 L 10 8 L 10 6 L 8 6 L 8 4 L 6 4 z M 15 6 L 15 8 L 24 8 L 24 22 L 20 22 L 20 24 L 22 24 L 22 26 L 24 26 L 24 28 L 26 28 L 26 26 L 28 26 L 28 24 L 30 24 L 30 22 L 26 22 L 26 6 L 15 6 z"
      /></svg
    >
  </button>
</div>

<Label class="font-semibold">To buy:</Label>
<div class="flex mt-1 text-stroke-none">
  <Input
    type="number"
    bind:value={buyAmountVal}
    oninput={() => setLeadingSide('buy')}
  />
  <TokenSelect class="max-w-32" bind:value={buyToken} />
</div>
<div class="mt-2">
  {#if buyTokenBalance != undefined}
    You have <span class="font-bold">{buyTokenBalance}</span>
    {buyToken?.symbol ?? ''}
  {/if}
</div>

<div class="flex justify-end items-end pt-4 gap-3">
  <!-- Prepare slippage -->
  <div class="flex flex-col gap-2">
    <Label class="" for="slippage">Max Slippage:</Label>
    <div class="inline-block relative text-stroke-none">
      <Input
        type="text"
        inputmode="numeric"
        bind:value={slippage}
        id="slippage"
        class="w-16"
      />
      <p class="absolute top-[0.79em] right-[0.5em]">%</p>
    </div>
  </div>
  <Button onclick={swap} disabled={quotes.length <= 0}>Swap</Button>
</div>

{#if noRouteAvailable}
  <div class="flex justify-center mt-5">
    <Card class="bg-red-800 text-wrap text-lg w-fit max-w-[27rem]">
      <p class="p-2">
        No route was found. That usually means that the liquidity pool available
        for this token can't cover the amount you requested.
      </p>
      <p class="p-2">
        Try selling the token you want to buy to re-balance the pool, or hope
        that someone else will do it, and try again later.
      </p>
    </Card>
  </div>
{/if}
