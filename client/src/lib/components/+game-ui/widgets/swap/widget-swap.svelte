<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import { Slider } from '$lib/components/ui/slider';
  import data from '$profileData';
  import { useDojo } from '$lib/contexts/dojo';
  import { useAvnu, type QuoteParams } from '$lib/utils/avnu.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { debounce } from '$lib/utils/debounce.svelte';
  import { type Quote } from '@avnu/avnu-sdk';
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import { notificationQueue } from '$lib/stores/event.store.svelte';
  import type { Token } from '$lib/interfaces';
  import { onMount } from 'svelte';
  import * as Tooltip from '$lib/components/ui/tooltip';

  let { client, accountManager } = useDojo();
  let avnu = useAvnu();

  // Svelte 5 reactive states using runes
  let sellAmount = $state('');
  let sellToken: Token | undefined = $state(data.availableTokens[0]);
  let buyAmount = $state('');
  let buyToken: Token | undefined = $state(data.availableTokens[1]);
  let noRouteAvailable = $state(false);
  let quotes: Quote[] = $state([]);
  let slippage = $state(0.5);
  let leadingSide = $state('sell');
  let percentage = $state(0);
  let showQuoteInfo = $state(false);

  let sellTokenBalance: CurrencyAmount | undefined = $state();
  let buyTokenBalance: CurrencyAmount | undefined = $state();

  async function getTokenBalance(address?: string) {
    if (!address || !accountManager?.getProvider()?.getWalletAccount()) {
      return 0;
    }

    return await fetchTokenBalance(
      address,
      accountManager.getProvider()?.getWalletAccount()!,
      client.provider,
    );
  }

  $effect(() => {
    sellTokenBalance = undefined;
    if (sellToken) {
      getTokenBalance(sellToken.address).then((balance) => {
        sellTokenBalance = CurrencyAmount.fromUnscaled(balance ?? 0, sellToken);
      });
    }
  });

  $effect(() => {
    buyTokenBalance = undefined;
    if (buyToken) {
      getTokenBalance(buyToken.address).then((balance) => {
        buyTokenBalance = CurrencyAmount.fromUnscaled(balance ?? 0, buyToken);
      });
    }
  });

  function handleSwap() {
    // Swap input values
    [sellAmount, buyAmount] = [buyAmount, sellAmount];
    // Swap selected tokens
    [sellToken, buyToken] = [buyToken, sellToken];
    // Update leading side
    leadingSide = leadingSide === 'sell' ? 'buy' : 'sell';
  }

  function setPercentage(percentageValue: number) {
    if (!sellTokenBalance) return;

    const amount = sellTokenBalance.rawValue().times(percentageValue / 100);
    sellAmount = amount.toString();
    leadingSide = 'sell';
  }

  let debouncedInput = debounce(
    () => {
      if (
        !sellToken ||
        !buyToken ||
        (!Number(sellAmount) && !Number(buyAmount))
      ) {
        return;
      }

      return {
        leadingSide,
        buyToken,
        sellToken,
        buyAmount:
          leadingSide === 'buy'
            ? CurrencyAmount.fromScaled(buyAmount, buyToken)
            : undefined,
        sellAmount:
          leadingSide === 'sell'
            ? CurrencyAmount.fromScaled(sellAmount, sellToken)
            : undefined,
      } as QuoteParams & { leadingSide: 'sell' | 'buy' };
    },
    { delay: 500 },
  );

  onMount(() => {
    debounce(
      () => {
        setPercentage(percentage);
      },
      { delay: 300 },
    );
  });

  $effect(() => {
    const data = debouncedInput.current;
    if (!data) {
      return;
    }
    noRouteAvailable = false;

    // Fetch some quotes
    avnu
      .fetchQuotes(data)
      .then((q) => {
        quotes = q;
        if (quotes.length == 0) {
          noRouteAvailable = true;
          return;
        }

        if (data.leadingSide == 'buy') {
          sellAmount = CurrencyAmount.fromUnscaled(q[0].sellAmount, sellToken)
            .rawValue()
            .toString();
        } else {
          buyAmount = CurrencyAmount.fromUnscaled(q[0].buyAmount, buyToken)
            .rawValue()
            .toString();
        }
      })
      .catch((error) => {
        noRouteAvailable = true;
      });
  });

  async function executeSwap() {
    if (quotes.length == 0) {
      return;
    }

    const quote = quotes[0];
    // Execute swap
    await avnu.executeSwap(quote, { slippage }).then((res) => {
      notificationQueue.addNotification(res?.transactionHash ?? null, 'swap');
    });
  }

  function validateSlippage(value: number) {
    if (isNaN(value)) return 0.5;
    return Math.max(0, Math.min(1, value));
  }
</script>

<div class="flex w-full mt-1 items-center gap-2 my-2">
  <span class="text-xs text-gray-400 min-w-fit">Amount:</span>
  <div class="flex-1">
    <Slider
      type="single"
      value={percentage}
      onValueChange={(value) => (percentage = value)}
      min={0}
      max={100}
      step={1}
      class="w-full"
    />
  </div>
  <div class="flex items-center gap-1">
    <input
      type="number"
      class="w-12 bg-[#282835] text-white rounded p-1 text-xs text-center"
      bind:value={percentage}
      min="0"
      max="100"
      step="1"
    />
    <span class="text-xs text-gray-400">%</span>
  </div>
</div>

<div class="flex flex-col relative">
  <div class="flex gap-2 rounded border border-[#ffffff55] p-2">
    <input
      type="number"
      class="w-full bg-[#282835] text-white rounded p-1"
      bind:value={sellAmount}
      oninput={() => (leadingSide = 'sell')}
    />
    <TokenSelect bind:value={sellToken} />
  </div>
  <div class="flex gap-2 rounded border border-[#ffffff55] p-2 mt-1">
    <input
      type="number"
      class="w-full bg-[#282835] text-white rounded p-1"
      bind:value={buyAmount}
      oninput={() => (leadingSide = 'buy')}
    />
    <TokenSelect bind:value={buyToken} />
  </div>
  <!-- svelte-ignore a11y_consider_explicit_label -->
  <button
    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
    onclick={handleSwap}
  >
    <svg
      width="26"
      height="26"
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="12.9365"
        cy="13.1347"
        r="11.6736"
        fill="#10101A"
        stroke="#57575E"
        stroke-width="1.45921"
      />
      <path
        d="M10.3827 8.02734V15.8384M10.3827 8.02734L7.8291 10.631M10.3827 8.02734L12.9363 10.631M15.4899 18.2418V10.4307M15.4899 18.2418L18.0435 15.6381M15.4899 18.2418L12.9363 15.6381"
        stroke="white"
        stroke-opacity="0.5"
        stroke-width="1.24462"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </button>
</div>

{#if quotes.length > 0}
  <div class="flex flex-col mt-3">
    <button
      class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-2"
      onclick={() => (showQuoteInfo = !showQuoteInfo)}
    >
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        class="transition-transform {showQuoteInfo ? 'rotate-90' : ''}"
      >
        <path
          d="M4 2L8 6L4 10"
          stroke="currentColor"
          stroke-width="2"
          fill="none"
        />
      </svg>
      Quote Details
    </button>
    {#if showQuoteInfo && quotes[0]}
      <div class="bg-[#1a1a24] rounded-lg p-3 space-y-1 text-sm">
        <div class="flex justify-between">
          <div class="flex items-center gap-1">
            <span class="text-gray-400">Route:</span>
            <Tooltip.Root>
              <Tooltip.Trigger asChild let:builder>
                <button
                  use:builder.action
                  {...builder}
                  class="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      stroke="currentColor"
                      stroke-width="1"
                      fill="none"
                    />
                    <text
                      x="6"
                      y="8.5"
                      text-anchor="middle"
                      font-size="7"
                      fill="currentColor">?</text
                    >
                  </svg>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                class="bg-black/90 text-white text-xs border-gray-600"
              >
                The DEX or liquidity source being used for this swap
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <span class="text-white">
            {quotes[0].routes?.[0]?.name || 'Direct'}
          </span>
        </div>
        <div class="flex justify-between">
          <div class="flex items-center gap-1">
            <span class="text-gray-400">Rate:</span>
            <Tooltip.Root>
              <Tooltip.Trigger asChild let:builder>
                <button
                  use:builder.action
                  {...builder}
                  class="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      stroke="currentColor"
                      stroke-width="1"
                      fill="none"
                    />
                    <text
                      x="6"
                      y="8.5"
                      text-anchor="middle"
                      font-size="7"
                      fill="currentColor">?</text
                    >
                  </svg>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                class="bg-black/90 text-white text-xs border-gray-600"
              >
                Current exchange rate between the selected tokens
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <span class="text-white">
            1 {sellToken?.symbol} = {(
              Number(buyAmount) / Number(sellAmount) || 0
            ).toFixed(6)}
            {buyToken?.symbol}
          </span>
        </div>
        {#if quotes[0].gasFeesInUsd}
          <div class="flex justify-between">
            <div class="flex items-center gap-1">
              <span class="text-gray-400">Gas Fee:</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild let:builder>
                  <button
                    use:builder.action
                    {...builder}
                    class="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        stroke="currentColor"
                        stroke-width="1"
                        fill="none"
                      />
                      <text
                        x="6"
                        y="8.5"
                        text-anchor="middle"
                        font-size="7"
                        fill="currentColor">?</text
                      >
                    </svg>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                  class="bg-black/90 text-white text-xs border-gray-600"
                >
                  Estimated network transaction cost for executing the swap
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <span class="text-white">
              ~${quotes[0].gasFeesInUsd.toFixed(4)}
            </span>
          </div>
        {/if}
        {#if quotes[0].avnuFeesInUsd}
          <div class="flex justify-between">
            <div class="flex items-center gap-1">
              <span class="text-gray-400">AVNU Fee:</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild let:builder>
                  <button
                    use:builder.action
                    {...builder}
                    class="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        stroke="currentColor"
                        stroke-width="1"
                        fill="none"
                      />
                      <text
                        x="6"
                        y="8.5"
                        text-anchor="middle"
                        font-size="7"
                        fill="currentColor">?</text
                      >
                    </svg>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                  class="bg-black/90 text-white text-xs border-gray-600"
                >
                  Protocol fee charged by AVNU for providing the swap service
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <span class="text-white">
              ~${quotes[0].avnuFeesInUsd.toFixed(4)}
              {#if quotes[0].avnuFeesBps}
                <span class="opacity-50"
                  >({(Number(quotes[0].avnuFeesBps) / 100).toFixed(2)}%)</span
                >
              {/if}
            </span>
          </div>
        {/if}
        {#if quotes[0].integratorFeesInUsd}
          <div class="flex justify-between">
            <div class="flex items-center gap-1">
              <span class="text-gray-400">Integrator Fee:</span>
              <Tooltip.Root>
                <Tooltip.Trigger asChild let:builder>
                  <button
                    use:builder.action
                    {...builder}
                    class="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <circle
                        cx="6"
                        cy="6"
                        r="5"
                        stroke="currentColor"
                        stroke-width="1"
                        fill="none"
                      />
                      <text
                        x="6"
                        y="8.5"
                        text-anchor="middle"
                        font-size="7"
                        fill="currentColor">?</text
                      >
                    </svg>
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content
                  class="bg-black/90 text-white text-xs border-gray-600"
                >
                  Fee paid to PonziLand for integrating the swap functionality
                </Tooltip.Content>
              </Tooltip.Root>
            </div>
            <span class="text-white">
              ~${quotes[0].integratorFeesInUsd.toFixed(4)}
              {#if quotes[0].integratorFeesBps}
                <span class="opacity-50"
                  >({(Number(quotes[0].integratorFeesBps) / 100).toFixed(
                    2,
                  )}%)</span
                >
              {/if}
            </span>
          </div>
        {/if}
        <div class="flex justify-between">
          <div class="flex items-center gap-1">
            <span class="text-gray-400">Slippage Tolerance:</span>
            <Tooltip.Root>
              <Tooltip.Trigger asChild let:builder>
                <button
                  use:builder.action
                  {...builder}
                  class="text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <circle
                      cx="6"
                      cy="6"
                      r="5"
                      stroke="currentColor"
                      stroke-width="1"
                      fill="none"
                    />
                    <text
                      x="6"
                      y="8.5"
                      text-anchor="middle"
                      font-size="7"
                      fill="currentColor">?</text
                    >
                  </svg>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content
                class="bg-black/90 text-white text-xs border-gray-600"
              >
                Maximum price movement you're willing to accept during the swap
              </Tooltip.Content>
            </Tooltip.Root>
          </div>
          <span class="text-white">{slippage}%</span>
        </div>
      </div>
    {/if}
  </div>
{/if}

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between">
    <label class="text-sm text-gray-400" for="slippage-input"
      >Slippage Tolerance</label
    >
    <div class="flex items-center gap-2">
      <input
        id="slippage-input"
        type="number"
        class="w-12 bg-[#282835] text-white rounded p-1"
        bind:value={slippage}
        min="0"
        max="1"
        step="0.01"
        oninput={(e: Event) =>
          (slippage = validateSlippage(
            parseFloat((e.target as HTMLInputElement).value),
          ))}
      />
      <span class="text-sm text-gray-400">%</span>
    </div>
  </div>
  <Button class="w-full" onclick={executeSwap} disabled={quotes.length <= 0}>
    SWAP
  </Button>
</div>

{#if noRouteAvailable}
  <div class="mt-4 p-3 bg-red-800/20 rounded text-red-400 text-sm">
    No route was found. That usually means that the liquidity pool available for
    this token can't cover the amount you requested.
  </div>
{/if}
