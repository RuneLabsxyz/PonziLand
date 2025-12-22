<script lang="ts">
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import RotatingCoin from '$lib/components/loading-screen/rotating-coin.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import InfoTooltip from '$lib/components/ui/info-tooltip.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import { Slider } from '$lib/components/ui/slider';
  import TokenSelect from '$lib/components/ui/token/token-select.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import type { Token } from '$lib/interfaces';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { useAvnu, type QuoteParams } from '$lib/utils/avnu.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { debounce } from '$lib/utils/debounce.svelte';
  import data from '$profileData';
  import type { Quote } from '@avnu/avnu-sdk';
  import { executeTransaction } from '$lib/transactions';

  interface Props {
    data?: {
      prefillBuyToken?: Token;
      prefillBuyAmount?: string;
      prefillSellToken?: Token;
    };
  }

  let { data: widgetData }: Props = $props();

  let { client, accountManager } = useDojo();
  let avnu = useAvnu();

  // Track if we've already applied prefill to avoid re-applying on re-renders
  let prefillApplied = $state(false);
  let lastPrefillData = $state<string | null>(null);

  // Svelte 5 reactive states using runes
  let sellAmount = $state('');
  let sellToken: Token | undefined = $state(
    data.availableTokens.find((t) => t.symbol === 'STRK') ||
      data.availableTokens[0],
  );
  let buyAmount = $state('');
  let buyToken: Token | undefined = $state(
    data.availableTokens.find((t) => t.symbol === 'BROTHER') ||
      data.availableTokens[1],
  );
  let noRouteAvailable = $state(false);
  let quotes: Quote[] = $state([]);
  let slippage = $state(0.5);
  let leadingSide = $state('sell');
  let percentage = $state(0);
  let showQuoteInfo = $state(false);
  let isLoadingQuotes = $state(false);

  let sellTokenBalance: CurrencyAmount | undefined = $state();
  let buyTokenBalance: CurrencyAmount | undefined = $state();

  let sliderVisible = $state(false);
  let buttonsVisible = $state(true);

  // Check if sell amount exceeds balance
  const hasInsufficientBalance = $derived.by(() => {
    if (!sellAmount || !Number(sellAmount) || !sellTokenBalance || !sellToken) {
      return false;
    }
    const sellAmountCurrency = CurrencyAmount.fromScaled(sellAmount, sellToken);
    return sellAmountCurrency.rawValue().gt(sellTokenBalance.rawValue());
  });

  // Get USDC as the base token for USD conversion
  const baseToken = $derived.by(() => {
    const usdcAddress =
      '0x053c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8';
    return data.availableTokens.find((t) => t.address === usdcAddress);
  });

  // Calculate USD values for sell and buy amounts
  const sellUsdValue = $derived.by(() => {
    if (!sellToken || !sellAmount || !Number(sellAmount) || !baseToken)
      return null;
    const sellAmountCurrency = CurrencyAmount.fromScaled(sellAmount, sellToken);
    return walletStore.convertTokenAmount(
      sellAmountCurrency,
      sellToken,
      baseToken,
    );
  });

  const buyUsdValue = $derived.by(() => {
    if (!buyToken || !buyAmount || !Number(buyAmount) || !baseToken)
      return null;
    const buyAmountCurrency = CurrencyAmount.fromScaled(buyAmount, buyToken);
    return walletStore.convertTokenAmount(
      buyAmountCurrency,
      buyToken,
      baseToken,
    );
  });

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

  // Apply prefill data when provided from buy-tab insufficient balance flow
  $effect(() => {
    if (!widgetData) {
      // Reset flag when widget data is cleared
      prefillApplied = false;
      lastPrefillData = null;
      return;
    }

    // Create a signature of current prefill data to detect changes
    const prefillSignature = JSON.stringify({
      buyToken: widgetData.prefillBuyToken?.address,
      buyAmount: widgetData.prefillBuyAmount,
      sellToken: widgetData.prefillSellToken?.address,
    });

    // Only apply if this is new prefill data
    if (prefillSignature !== lastPrefillData) {
      lastPrefillData = prefillSignature;

      // Apply prefill values
      if (widgetData.prefillBuyToken) {
        buyToken = widgetData.prefillBuyToken;
      }
      if (widgetData.prefillSellToken) {
        sellToken = widgetData.prefillSellToken;
      }
      if (widgetData.prefillBuyAmount) {
        buyAmount = widgetData.prefillBuyAmount;
        leadingSide = 'buy'; // Set leading side to buy since we're specifying buy amount
        sellAmount = ''; // Clear sell amount to trigger quote fetch
        isLoadingQuotes = true;
      }
    }
  });

  function handleSwap() {
    [sellToken, buyToken] = [buyToken, sellToken];
    if (leadingSide === 'sell') {
      buyAmount = '';
    } else if (leadingSide === 'buy') {
      sellAmount = '';
    }
  }

  function setPercentage(percentageValue: number) {
    buyAmount = '';
    isLoadingQuotes = true;
    if (!sellTokenBalance) return;

    const amount = sellTokenBalance.rawValue().times(percentageValue / 100);
    sellAmount = amount.isZero() ? '' : amount.toString();
    leadingSide = 'sell';
  }

  let debouncedInput = debounce(
    () => {
      if (!sellToken || !buyToken) {
        return;
      }

      // Calculate amounts with type protection
      const calculatedBuyAmount =
        leadingSide === 'buy' &&
        buyAmount &&
        buyAmount !== '' &&
        Number(buyAmount) > 0
          ? CurrencyAmount.fromScaled(buyAmount, buyToken)
          : undefined;

      const calculatedSellAmount =
        leadingSide === 'sell' &&
        sellAmount &&
        sellAmount !== '' &&
        Number(sellAmount) > 0
          ? CurrencyAmount.fromScaled(sellAmount, sellToken)
          : undefined;

      // Return early if no valid amounts
      if (!calculatedBuyAmount && !calculatedSellAmount) {
        quotes = [];
        isLoadingQuotes = false;
        return;
      }

      return {
        leadingSide,
        buyToken,
        sellToken,
        buyAmount: calculatedBuyAmount,
        sellAmount: calculatedSellAmount,
      } as QuoteParams & { leadingSide: 'sell' | 'buy' };
    },
    { delay: 500 },
  );

  $effect(() => {
    const data = debouncedInput.current;
    if (!data) {
      isLoadingQuotes = false;
      return;
    }
    noRouteAvailable = false;
    isLoadingQuotes = true;

    // Fetch some quotes
    avnu
      .fetchQuotes(data)
      .then((q) => {
        quotes = q;
        if (quotes.length == 0) {
          noRouteAvailable = true;
          isLoadingQuotes = false;
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
        isLoadingQuotes = false;
      })
      .catch((error) => {
        noRouteAvailable = true;
        isLoadingQuotes = false;
      });
  });

  let isExecutingSwap = $state(false);

  async function executeSwapAction() {
    if (quotes.length == 0 || !sellToken || !buyToken) {
      return;
    }

    isExecutingSwap = true;
    try {
      const quote = quotes[0];

      // Calculate amounts for optimistic updates
      const sellAmountCurrency = CurrencyAmount.fromScaled(
        sellAmount,
        sellToken,
      );
      const buyAmountCurrency = CurrencyAmount.fromScaled(buyAmount, buyToken);

      await executeTransaction({
        execute: async () => {
          const res = await avnu.executeSwap(quote, { slippage });
          // Normalize AVNU response (transactionHash -> transaction_hash)
          return res?.transactionHash
            ? { transaction_hash: res.transactionHash }
            : null;
        },
        deductions: [
          { tokenAddress: sellToken.address, amount: sellAmountCurrency },
        ],
        additions: [
          { tokenAddress: buyToken.address, amount: buyAmountCurrency },
        ],
        notificationName: 'swap',
        onError: (error) => {
          console.error('Swap execution failed:', error);
        },
      });
    } finally {
      isExecutingSwap = false;
    }
  }

  function validateSlippage(value: number) {
    if (isNaN(value)) return 0.5;
    return Math.max(0, Math.min(1, value));
  }
</script>

<div class="flex flex-col relative mt-2">
  <!-- Leading side indicator -->
  <div
    class="absolute h-10 left-0 top-0 w-1 bg-blue-500 rounded-r transition-transform duration-200 z-10 {leadingSide ===
    'sell'
      ? ' translate-y-2'
      : 'translate-y-[140px]'}"
  ></div>
  <div class="flex flex-col gap-2 rounded border border-[#ffffff55] p-2">
    <div class="flex flex-col w-full">
      <div class="flex w-full gap-2">
        <Input
          type="number"
          class="w-full bg-[#282835] text-white rounded"
          bind:value={sellAmount}
          oninput={() => {
            leadingSide = 'sell';
            buyAmount = '';
            isLoadingQuotes = true;
          }}
          placeholder="0.00"
        />
        <TokenSelect bind:value={sellToken} variant="swap" />
      </div>
      <div class="flex justify-between h-4">
        <div class=" text-gray-400 mt-1 px-1 text-lg tracking-wide">
          {#if sellUsdValue}
            ${sellUsdValue.toString()}
          {:else if isLoadingQuotes}
            <RotatingCoin />
          {/if}
        </div>
        <div class=" text-gray-400 mt-1 text-right flex">
          {#if hasInsufficientBalance}
            <div class=" text-red-400 px-1">Insufficient balance</div>
          {/if}
          {#if sellToken && sellTokenBalance}
            Balance: {sellTokenBalance.toString()}
          {/if}
        </div>
      </div>
    </div>
    {#if sliderVisible}
      <div class="flex w-full mt-2 items-center gap-2">
        <span class=" text-gray-400 min-w-fit">Amount:</span>
        <div class="flex-1 relative">
          <Slider
            type="single"
            value={percentage}
            onValueChange={(value) => (percentage = value)}
            min={0}
            max={100}
            step={1}
            class="w-full"
          />
          <!-- Percentage marks -->
          <div class="flex justify-between mt-1 px-1">
            <button
              class=" text-gray-400 hover:text-white cursor-pointer"
              onclick={() => setPercentage(25)}
            >
              25%
            </button>
            <button
              class=" text-gray-400 hover:text-white cursor-pointer"
              onclick={() => setPercentage(50)}
            >
              50%
            </button>
            <button
              class=" text-gray-400 hover:text-white cursor-pointer"
              onclick={() => setPercentage(75)}
            >
              75%
            </button>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <input
            type="number"
            class="w-12 bg-[#282835] text-white rounded p-1 text-center"
            bind:value={percentage}
            min="0"
            max="100"
            step="1"
          />
          <span class=" text-gray-400">%</span>
        </div>
      </div>
    {/if}
    {#if buttonsVisible}
      <div class="flex justify-between my-2 opacity-90">
        <Button size="md" class="w-full" onclick={() => setPercentage(25)}>
          25%
        </Button>
        <Button size="md" class="w-full" onclick={() => setPercentage(50)}>
          50%
        </Button>
        <Button size="md" class="w-full" onclick={() => setPercentage(75)}>
          75%
        </Button>
        <Button size="md" class="w-full" onclick={() => setPercentage(100)}>
          MAX
        </Button>
      </div>
    {/if}
  </div>

  <div class="w-full flex justify-center items-center h-2 z-50">
    <button
      aria-label="Swap tokens"
      class="cursor-pointer hover:rotate-180 transition-transform"
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

  <div class="flex gap-2 rounded border border-[#ffffff55] p-2">
    <div class="flex flex-col w-full pb-2">
      <div class="flex w-full gap-2">
        <Input
          type="number"
          class="w-full bg-[#282835] text-white rounded"
          bind:value={buyAmount}
          oninput={() => {
            leadingSide = 'buy';
            sellAmount = '';
            isLoadingQuotes = true;
          }}
          placeholder="0.00"
        />
        <TokenSelect bind:value={buyToken} variant="swap" />
      </div>
      <div class="flex justify-between h-4">
        <div class=" text-gray-400 mt-1 px-1 text-lg tracking-wide">
          {#if buyUsdValue}
            ${buyUsdValue.toString()}
          {:else if isLoadingQuotes}
            <RotatingCoin />
          {/if}
        </div>
        <div class=" text-gray-400 mt-1 text-right">
          {#if buyToken && buyTokenBalance}
            Balance: {buyTokenBalance.toString()}
          {/if}
        </div>
      </div>
    </div>
  </div>
  <!-- svelte-ignore a11y_consider_explicit_label -->
</div>

{#if quotes.length > 0}
  <div class="flex flex-col mt-3">
    <div class="flex items-center justify-between mb-2">
      <button
        class="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
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
      <div class="flex items-center gap-1 text-sm text-gray-400">
        {#if isLoadingQuotes}
          <span>Loading...</span>
          <RotatingCoin />
        {:else if quotes[0]?.gasFeesInUsd}
          <span>Gas:</span>
          <span class="text-white">${quotes[0].gasFeesInUsd.toFixed(2)}</span>
        {/if}
      </div>
    </div>
    {#if showQuoteInfo && quotes[0]}
      <div class="bg-[#1a1a24] rounded-lg p-3 space-y-1 text-sm">
        <div class="flex justify-between">
          <div class="flex items-center gap-1">
            <span class="text-gray-400">Route:</span>
            <InfoTooltip
              text="The DEX or liquidity source being used for this swap"
            />
          </div>
          <span class="text-white">
            {quotes[0].routes?.[0]?.name || 'Direct'}
          </span>
        </div>
        <div class="flex justify-between">
          <div class="flex items-center gap-1">
            <span class="text-gray-400">Rate:</span>
            <InfoTooltip
              text="Current exchange rate between the selected tokens"
            />
          </div>
          <span class="text-white">
            1 {sellToken?.symbol} = {(
              Number(buyAmount) / Number(sellAmount) || 0
            ).toFixed(6)}
            {buyToken?.symbol}
          </span>
        </div>
        <div class="flex justify-between">
          <div class="flex items-center gap-1">
            <span class="text-gray-400">Gas Fee:</span>
            <InfoTooltip
              text="Estimated network transaction cost for executing the swap"
            />
          </div>
          {#if quotes[0].gasFeesInUsd}
            <span class="text-white">
              ~${quotes[0].gasFeesInUsd.toFixed(4)}
            </span>
          {/if}
        </div>
        {#if quotes[0].avnuFeesInUsd}
          <div class="flex justify-between">
            <div class="flex items-center gap-1">
              <span class="text-gray-400">AVNU Fee:</span>
              <InfoTooltip
                text="Protocol fee charged by AVNU for providing the swap service"
              />
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
              <InfoTooltip
                text="Fee paid to PonziLand for integrating the swap functionality"
              />
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
        <div class="flex gap-2">
          <div class="flex items-center gap-1 flex-1">
            <span class="text-gray-400">Slippage Tolerance:</span>
            <InfoTooltip
              text="Maximum price movement you're willing to accept during the swap"
            />
          </div>
          <div class="flex items-center gap-2">
            <div class="flex gap-1">
              <Button
                class="px-1 {slippage === 0.1 ? 'opacity-100' : 'opacity-50'}"
                size="md"
                onclick={() => (slippage = 0.1)}
              >
                0.1%
              </Button>
              <Button
                class="px-1 {slippage === 0.5 ? 'opacity-100' : 'opacity-50'}"
                size="md"
                onclick={() => (slippage = 0.5)}
              >
                0.5%
              </Button>
              <Button
                class="px-1 {slippage === 1 ? 'opacity-100' : 'opacity-50'}"
                size="md"
                onclick={() => (slippage = 1)}
              >
                1%
              </Button>
            </div>
            <div class="flex items-center gap-1">
              <Input
                class="w-8 h-6 text-lg"
                type="number"
                bind:value={slippage}
                min="0"
                max="1"
                step="0.01"
                oninput={(e: Event) =>
                  (slippage = validateSlippage(
                    parseFloat((e.target as HTMLInputElement).value),
                  ))}
              />
              <span class="text-white">%</span>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<div class="flex flex-col gap-2 mt-2">
  <Button
    class="w-full"
    onclick={executeSwapAction}
    disabled={isLoadingQuotes ||
      isExecutingSwap ||
      quotes.length <= 0 ||
      !quotes[0]?.gasFeesInUsd ||
      hasInsufficientBalance}
  >
    {#if isExecutingSwap}
      Swapping...
    {:else if isLoadingQuotes}
      Loading...
    {:else if hasInsufficientBalance}
      Insufficient Balance
    {:else}
      SWAP
    {/if}
  </Button>
</div>

{#if noRouteAvailable}
  <div class="mt-4 p-3 bg-red-800/20 rounded text-red-400 text-sm">
    No route was found. That usually means that the liquidity pool available for
    this token can't cover the amount you requested.
  </div>
{/if}
