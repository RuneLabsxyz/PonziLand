<script lang="ts">
  import Button from '$lib/components/ui/button/button.svelte';
  import data from '$profileData';
  import { useDojo } from '$lib/contexts/dojo';
  import { useAvnu, type QuoteParams } from '$lib/utils/avnu.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { debounce } from '$lib/utils/debounce.svelte';
  import { type Quote } from '@avnu/avnu-sdk';
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import TokenSelect from '$lib/components/swap/token-select.svelte';
  import { notificationQueue } from '$lib/stores/event.store.svelte';

  let { client, accountManager } = useDojo();
  let avnu = useAvnu();

  // Svelte 5 reactive states using runes
  let input1 = $state('');
  let select1 = $state(data.availableTokens[0]?.address || '');
  let input2 = $state('');
  let select2 = $state(data.availableTokens[1]?.address || '');
  let noRouteAvailable = $state(false);
  let quotes: Quote[] = $state([]);
  let slippage = $state(0.5);
  let leadingSide = $state('sell');

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
    if (select1) {
      getTokenBalance(select1).then((balance) => {
        sellTokenBalance = CurrencyAmount.fromUnscaled(
          balance ?? 0,
          data.availableTokens.find((t) => t.address === select1),
        );
      });
    }
  });

  $effect(() => {
    buyTokenBalance = undefined;
    if (select2) {
      getTokenBalance(select2).then((balance) => {
        buyTokenBalance = CurrencyAmount.fromUnscaled(
          balance ?? 0,
          data.availableTokens.find((t) => t.address === select2),
        );
      });
    }
  });

  function handleSwap() {
    // Swap input values
    [input1, input2] = [input2, input1];
    // Swap selected tokens
    [select1, select2] = [select2, select1];
    // Update leading side
    leadingSide = leadingSide === 'sell' ? 'buy' : 'sell';
  }

  function setPercentage(percentage: number) {
    if (!sellTokenBalance) return;

    const amount = sellTokenBalance.rawValue().times(percentage / 100);
    input1 = amount.toString();
    leadingSide = 'sell';
  }

  let debouncedInput = debounce(
    () => {
      if (!select1 || !select2 || (!Number(input1) && !Number(input2))) {
        return;
      }

      const sellToken = data.availableTokens.find((t) => t.address === select1);
      const buyToken = data.availableTokens.find((t) => t.address === select2);

      return {
        leadingSide,
        buyToken,
        sellToken,
        buyAmount:
          leadingSide === 'buy' ? CurrencyAmount.fromScaled(input2) : undefined,
        sellAmount:
          leadingSide === 'sell'
            ? CurrencyAmount.fromScaled(input1)
            : undefined,
      } as QuoteParams & { leadingSide: 'sell' | 'buy' };
    },
    { delay: 500 },
  );

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
        input1 = CurrencyAmount.fromUnscaled(q[0].sellAmount)
          .rawValue()
          .toString();
      } else {
        input2 = CurrencyAmount.fromUnscaled(q[0].buyAmount)
          .rawValue()
          .toString();
      }
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

<div class="flex flex-col">
  <div class="flex w-full gap-1 mt-1 items-center">
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
      Max
    </Button>
  </div>
  <div class="flex flex-col relative">
    <div class="flex gap-2 rounded border border-[#ffffff55] p-2">
      <input
        type="number"
        class="w-full bg-[#282835] text-white rounded p-1"
        bind:value={input1}
        oninput={() => (leadingSide = 'sell')}
      />
      <TokenSelect bind:value={select1} />
    </div>
    <div class="flex gap-2 rounded border border-[#ffffff55] p-2 mt-1">
      <input
        type="number"
        class="w-full bg-[#282835] text-white rounded p-1"
        bind:value={input2}
        oninput={() => (leadingSide = 'buy')}
      />
      <TokenSelect bind:value={select2} />
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
</div>

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
