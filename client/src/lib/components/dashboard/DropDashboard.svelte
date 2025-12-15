<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import {
    coordinatesToLocation,
    getTokenInfo,
    locationToCoordinates,
    padAddress,
    shortenHex,
  } from '$lib/utils';
  import data from '$profileData';
  import type { Token } from '$lib/interfaces';
  import type {
    DropLandResponse,
    GlobalDropMetricsResponse,
    TokenAmountMap,
  } from '$lib/api/drops/requests';
  import {
    fetchDropLands,
    fetchGlobalMetrics,
  } from '$lib/api/drops/requests';
  import {
    getTokenPrices,
    type TokenPrice,
  } from '$lib/api/defi/ekubo/requests';

const dropWallets = Array.isArray(data.dropLand?.address)
  ? data.dropLand.address
  : data.dropLand?.address
    ? [data.dropLand.address]
    : [];

  let reinjector = $state(dropWallets[0] ?? '');
  let drops = $state<DropLandResponse[]>([]);
  let loading = $state(false);
  let error = $state('');
  let level = $state(1);
  let feeRate = $state(250_000);
  let saleFeeRate = $state(500_000);
  let locationFilter = $state('');
  let since = $state('');
  let until = $state('');
  let lastUpdated = $state<Date | null>(null);
  let globalMetrics = $state<GlobalDropMetricsResponse | null>(null);
  let globalLoading = $state(false);
  let globalError = $state('');
  let globalLastUpdated = $state<Date | null>(null);
  let tokenPrices = $state<TokenPrice[]>([]);
  let showRawResponse = $state(false);
  let showGlobalRawResponse = $state(false);
  let copyStatus = $state<'idle' | 'success' | 'error'>('idle');
  let globalCopyStatus = $state<'idle' | 'success' | 'error'>('idle');
  let copyStatusTimeout: ReturnType<typeof setTimeout> | null = null;
  let globalCopyStatusTimeout: ReturnType<typeof setTimeout> | null = null;
const usdcToken =
  data.availableTokens.find(
    (token) => token.symbol?.toUpperCase() === 'USDC',
  ) ?? null;
const mainCurrencyAddress = data.mainCurrencyAddress;
const mainCurrencyToken = mainCurrencyAddress
  ? getTokenInfo(mainCurrencyAddress)
  : null;

type TokenBreakdownRow = {
  tokenAddress: string;
  label: string;
  amountFormatted: string;
  usdAmount: CurrencyAmount | null;
  usdFormatted: string | null;
};
type GlobalTokenRow = {
  tokenAddress: string;
  label: string;
  feesFormatted: string;
  inflowsFormatted: string;
  saleFeesFormatted: string;
  distributedFormatted: string;
  feesUsd: CurrencyAmount | null;
  inflowsUsd: CurrencyAmount | null;
  saleFeesUsd: CurrencyAmount | null;
  distributedUsd: CurrencyAmount | null;
  feesUsdFormatted: string | null;
  inflowsUsdFormatted: string | null;
  saleFeesUsdFormatted: string | null;
  distributedUsdFormatted: string | null;
};
  let dropResponseJson = $derived(JSON.stringify(drops, null, 2));
  let globalResponseJson = $derived(
    globalMetrics ? JSON.stringify(globalMetrics, null, 2) : ''
  );
  let copyStatusMessage = $derived(
    copyStatus === 'success'
      ? 'JSON copied'
      : copyStatus === 'error'
        ? 'Failed to copy JSON'
        : '',
  );
  let globalCopyStatusMessage = $derived(
    globalCopyStatus === 'success'
      ? 'JSON copied'
      : globalCopyStatus === 'error'
        ? 'Failed to copy JSON'
        : ''
  );

  onMount(() => {
    if (reinjector) {
      loadDrops();
    }
    loadTokenPrices();
  });

  async function loadDrops() {
    if (!reinjector) {
      error = 'No reinjector address configured';
      loading = false;
      return;
    }

    loading = true;
    error = '';

    try {
      console.log('Fetching drops with params:', {
        reinjector,
        level,
        feeRate,
        since,
        until,
        locationFilter,
      });

      const fetchedDrops = await fetchDropLands(
        reinjector,
        level,
        feeRate,
        saleFeeRate,
        since || undefined,
        until || undefined,
        parseLocationFilter(locationFilter) ?? undefined,
      );

      console.log('Fetched drops:', fetchedDrops.length, fetchedDrops);

      drops = [...fetchedDrops].sort(
        (a, b) =>
          new Date(b.time_bought).getTime() - new Date(a.time_bought).getTime(),
      );
      lastUpdated = new Date();
    } catch (err) {
      console.error('Error loading drops:', err);
      error =
        err instanceof Error ? err.message : 'Error loading drop lands';
    } finally {
      loading = false;
      console.log('Loading finished, loading state:', loading);
    }
  }

  async function loadGlobalMetrics() {
    if (!reinjector) {
      globalError = 'No reinjector address configured';
      globalLoading = false;
      return;
    }

    globalLoading = true;
    globalError = '';

    try {
      const metrics = await fetchGlobalMetrics(
        reinjector,
        level,
        feeRate,
        saleFeeRate,
        since || undefined,
        until || undefined,
      );
      globalMetrics = metrics;
      globalLastUpdated = new Date();
    } catch (err) {
      console.error('Error loading global metrics:', err);
      globalError =
        err instanceof Error ? err.message : 'Error loading global metrics';
    } finally {
      globalLoading = false;
    }
  }

  function setCopyStatus(status: 'idle' | 'success' | 'error') {
    copyStatus = status;
    if (copyStatusTimeout) {
      clearTimeout(copyStatusTimeout);
      copyStatusTimeout = null;
    }
    if (status !== 'idle') {
      copyStatusTimeout = setTimeout(() => {
        copyStatus = 'idle';
        copyStatusTimeout = null;
      }, 2000);
    }
  }

  function fallbackCopy(value: string) {
    if (typeof document === 'undefined') return;

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }

  async function copyDropResponseJson() {
    const textToCopy = dropResponseJson;
    if (!textToCopy) return;

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        fallbackCopy(textToCopy);
      }
      setCopyStatus('success');
    } catch (err) {
      console.error('Error copying drop response JSON:', err);
      setCopyStatus('error');
    }
  }

  function setGlobalCopyStatus(status: 'idle' | 'success' | 'error') {
    globalCopyStatus = status;
    if (globalCopyStatusTimeout) {
      clearTimeout(globalCopyStatusTimeout);
      globalCopyStatusTimeout = null;
    }
    if (status !== 'idle') {
      globalCopyStatusTimeout = setTimeout(() => {
        globalCopyStatus = 'idle';
        globalCopyStatusTimeout = null;
      }, 2000);
    }
  }

  async function copyGlobalResponseJson() {
    const textToCopy = globalResponseJson;
    if (!textToCopy) return;

    try {
      if (
        typeof navigator !== 'undefined' &&
        navigator.clipboard?.writeText
      ) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        fallbackCopy(textToCopy);
      }
      setGlobalCopyStatus('success');
    } catch (err) {
      console.error('Error copying global metrics JSON:', err);
      setGlobalCopyStatus('error');
    }
  }

  onDestroy(() => {
    if (copyStatusTimeout) {
      clearTimeout(copyStatusTimeout);
      copyStatusTimeout = null;
    }
    if (globalCopyStatusTimeout) {
      clearTimeout(globalCopyStatusTimeout);
      globalCopyStatusTimeout = null;
    }
  });

  async function loadTokenPrices() {
    try {
      tokenPrices = await getTokenPrices();
    } catch (err) {
      console.error('Error loading token prices:', err);
    }
  }

  function formatTokenAmount(
    tokenAddress: string,
    amount: string,
    fallbackTokenAddress?: string,
  ) {
    const decimalAmount = hexToDecimal(amount);
    let token = getTokenInfo(tokenAddress);

    // If token not found and fallback provided, try fallback
    if (!token && fallbackTokenAddress) {
      token = getTokenInfo(fallbackTokenAddress);
    }

    if (!token) {
      // If still no token found, return the decimal amount as-is
      // This handles cases where stake_token is unknown (like "0x0")
      return decimalAmount;
    }
    return CurrencyAmount.fromUnscaled(decimalAmount, token).toString();
  }

  function formatLocation(value: number) {
    const coords = locationToCoordinates(value);
    return `${coords.x}, ${coords.y}`;
  }

  function formatTimestamp(value?: string | null) {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleString();
  }

  function formatRoi(value: number) {
    if (!Number.isFinite(value)) return '—';
    return `${(value * 100).toFixed(2)}%`;
  }

  function getTokenLabel(address: string) {
    const token = getTokenInfo(address);
    return token ? token.symbol : shortenHex(address);
  }

  function hexToDecimal(value: string): string {
    if (typeof value === 'string' && value.startsWith('0x')) {
      try {
        return BigInt(value).toString();
      } catch {
        return value;
      }
    }
    return value;
  }

  function parseLocationFilter(filter: string): number | null {
    const normalized = filter.trim();
    if (!normalized) return null;
    if (normalized.includes(',')) {
      const [xPart, yPart] = normalized.split(',').map((part) => part.trim());
      const x = Number(xPart);
      const y = Number(yPart);
      if (
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x >= 0 &&
        y >= 0 &&
        x <= 255 &&
        y <= 255
      ) {
        return coordinatesToLocation({ x, y });
      }
      return null;
    }
    if (normalized.startsWith('0x')) {
      const parsed = Number.parseInt(normalized, 16);
      return Number.isNaN(parsed) ? null : parsed;
    }
    const parsed = Number(normalized);
    return Number.isNaN(parsed) ? null : parsed;
  }

  function getTokenPrice(address: string) {
    const normalized = padAddress(address);
    if (!normalized) return null;

    if (
      mainCurrencyAddress &&
      padAddress(mainCurrencyAddress) === normalized &&
      mainCurrencyToken
    ) {
      return {
        symbol: mainCurrencyToken.symbol ?? '',
        address: mainCurrencyToken.address,
        ratio: CurrencyAmount.fromScaled(1, mainCurrencyToken),
      };
    }

    return (
      tokenPrices.find(
        (price) => padAddress(price.address) === normalized,
      ) ?? null
    );
  }

  function convertAmount(
    amount: CurrencyAmount,
    fromToken: Token,
    toToken: Token,
  ) {
    if (padAddress(fromToken.address) === padAddress(toToken.address)) {
      return amount;
    }

    const fromPrice = getTokenPrice(fromToken.address);
    const toPrice = getTokenPrice(toToken.address);
    if (!fromPrice || !toPrice) return null;

    const baseValue = amount
      .rawValue()
      .dividedBy(fromPrice.ratio.rawValue());
    if (!baseValue.isFinite()) return null;

    const convertedValue = baseValue.multipliedBy(toPrice.ratio.rawValue());
    return CurrencyAmount.fromRaw(convertedValue, toToken);
  }

  function toCurrencyAmount(
    tokenAddress: string,
    amount: string,
    fallbackTokenAddress?: string,
  ) {
    const decimalAmount = hexToDecimal(amount);
    let token = getTokenInfo(tokenAddress);
    if (!token && fallbackTokenAddress) {
      token = getTokenInfo(fallbackTokenAddress);
    }
    if (!token) return null;
    try {
      return CurrencyAmount.fromUnscaled(decimalAmount, token);
    } catch (err) {
      console.warn('Failed to parse amount', tokenAddress, err);
      return null;
    }
  }

  function toUsdCurrencyAmount(
    tokenAddress: string,
    amount: string,
    fallbackTokenAddress?: string,
  ) {
    if (!usdcToken) return null;
    const currencyAmount = toCurrencyAmount(
      tokenAddress,
      amount,
      fallbackTokenAddress,
    );
    if (!currencyAmount) return null;
    const sourceToken = currencyAmount.getToken();
    if (!sourceToken) return null;
    return convertAmount(currencyAmount, sourceToken, usdcToken);
  }

  function addCurrencyAmounts(
    total: CurrencyAmount | null,
    amount: CurrencyAmount | null,
  ) {
    if (!amount) return total;
    if (!total) return amount;
    try {
      return total.add(amount);
    } catch (err) {
      console.warn('Failed to add currency amounts', err);
      return total;
    }
  }

  function subtractCurrencyAmounts(
    total: CurrencyAmount | null,
    amount: CurrencyAmount | null,
  ) {
    if (!total) return null;
    if (!amount) return total;
    const totalToken = total.getToken();
    const amountToken = amount.getToken();
    if (
      totalToken &&
      amountToken &&
      totalToken.address !== amountToken.address
    ) {
      console.warn('Failed to subtract currency amounts: incompatible tokens');
      return total;
    }
    const resultToken = totalToken ?? amountToken;
    try {
      return CurrencyAmount.fromRaw(
        total.rawValue().minus(amount.rawValue()),
        resultToken,
      );
    } catch (err) {
      console.warn('Failed to subtract currency amounts', err);
      return total;
    }
  }

  function sumCurrencyAmounts(...amounts: (CurrencyAmount | null)[]) {
    return amounts.reduce(
      (total, amount) => addCurrencyAmounts(total, amount),
      null as CurrencyAmount | null,
    );
  }

  function buildGlobalTokenRows(
    metrics?: GlobalDropMetricsResponse | null,
  ): GlobalTokenRow[] {
    if (!metrics) return [];

    return metrics.per_token.map((entry) => {
      const feesUsd = toUsdCurrencyAmount(entry.token, entry.fees);
      const inflowsUsd = toUsdCurrencyAmount(entry.token, entry.inflows);
      const saleFeesUsd = toUsdCurrencyAmount(entry.token, entry.sale_fees);
      const distributedUsd = toUsdCurrencyAmount(
        entry.token,
        entry.distributed,
      );
      return {
        tokenAddress: entry.token,
        label: getTokenLabel(entry.token),
        feesFormatted: formatTokenAmount(entry.token, entry.fees),
        inflowsFormatted: formatTokenAmount(entry.token, entry.inflows),
        saleFeesFormatted: formatTokenAmount(entry.token, entry.sale_fees),
        distributedFormatted: formatTokenAmount(
          entry.token,
          entry.distributed,
        ),
        feesUsd,
        inflowsUsd,
        saleFeesUsd,
        distributedUsd,
        feesUsdFormatted: feesUsd ? feesUsd.toString() : null,
        inflowsUsdFormatted: inflowsUsd ? inflowsUsd.toString() : null,
        saleFeesUsdFormatted: saleFeesUsd ? saleFeesUsd.toString() : null,
        distributedUsdFormatted: distributedUsd
          ? distributedUsd.toString()
          : null,
      };
    });
  }

  function buildTokenRows(
    tokenMap?: TokenAmountMap,
    fallbackTokenAddress?: string,
  ): TokenBreakdownRow[] {
    return Object.entries(tokenMap ?? {}).map(([tokenAddress, value]) => {
      const usdAmount = toUsdCurrencyAmount(
        tokenAddress,
        value,
        fallbackTokenAddress,
      );
      return {
        tokenAddress,
        label: getTokenLabel(tokenAddress),
        amountFormatted: formatTokenAmount(
          tokenAddress,
          value,
          fallbackTokenAddress,
        ),
        usdAmount,
        usdFormatted: usdAmount ? usdAmount.toString() : null,
      };
    });
  }

  function sumUsdFromRows(rows: TokenBreakdownRow[]) {
    return rows.reduce(
      (total, row) => addCurrencyAmounts(total, row.usdAmount),
      null as CurrencyAmount | null,
    );
  }

  function toMainCurrencyAmount(amount: string) {
    if (!mainCurrencyAddress) return null;
    return toCurrencyAmount(mainCurrencyAddress, amount, mainCurrencyAddress);
  }

  function convertMainCurrencyToUsd(amount: CurrencyAmount | null) {
    if (!amount || !mainCurrencyToken || !usdcToken) return null;
    return convertAmount(amount, mainCurrencyToken, usdcToken);
  }

  function matchesFilters(
    drop: DropLandResponse,
    locationValue: number | null,
  ) {
    if (locationValue !== null && drop.land_location !== locationValue) {
      return false;
    }
    return true;
  }

  let parsedLocationFilter = $derived(parseLocationFilter(locationFilter));
  let filteredDrops = $derived(drops.filter((drop) =>
    matchesFilters(drop, parsedLocationFilter),
  ));
  let activeDrops = $derived(filteredDrops.filter((drop) => drop.is_active).length);
  let averageRoi = $derived(
    filteredDrops.length > 0
      ? filteredDrops.reduce((sum, drop) => sum + drop.drop_roi, 0) /
        filteredDrops.length
      : 0
  );

  let globalTokenRows = $derived(buildGlobalTokenRows(globalMetrics));
  let totalFeesUsd = $derived(
    globalTokenRows.reduce(
      (total, row) => addCurrencyAmounts(total, row.feesUsd),
      null as CurrencyAmount | null,
    ),
  );
  let totalSaleFeesUsd = $derived(
    globalTokenRows.reduce(
      (total, row) => addCurrencyAmounts(total, row.saleFeesUsd),
      null as CurrencyAmount | null,
    ),
  );
  let totalDistributedUsd = $derived(
    globalTokenRows.reduce(
      (total, row) => addCurrencyAmounts(total, row.distributedUsd),
      null as CurrencyAmount | null,
    ),
  );
  let totalInflowsUsd = $derived(
    globalTokenRows.reduce(
      (total, row) => addCurrencyAmounts(total, row.inflowsUsd),
      null as CurrencyAmount | null,
    ),
  );
  let totalAuctionsAmount = $derived(
    globalMetrics
      ? toMainCurrencyAmount(globalMetrics.total_influenced_auctions)
      : null,
  );
  let totalAuctionsUsd = $derived(
    convertMainCurrencyToUsd(totalAuctionsAmount),
  );
  let totalPositiveUsd = $derived(
    sumCurrencyAmounts(
      totalFeesUsd,
      totalSaleFeesUsd,
      totalInflowsUsd,
      totalAuctionsUsd,
    ),
  );
  let globalUsdRoi = $derived(
    totalPositiveUsd &&
      totalDistributedUsd &&
      !totalDistributedUsd.rawValue().isZero()
      ? totalPositiveUsd
          .rawValue()
          .minus(totalDistributedUsd.rawValue())
          .dividedBy(totalDistributedUsd.rawValue())
          .toNumber() // (received - distributed) / distributed
      : null
  );

  // Aggregation removed per UX feedback (per-drop details already expose all info)
</script>

<Card class="shadow-ponzi overflow-hidden">
  <div class="space-y-6">
    <div
      class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-xs text-gray-400 uppercase tracking-wide">
          Drop dashboard
        </p>
        <h2 class="text-2xl font-bold text-white">Explore reinjections</h2>
        {#if lastUpdated}
          <p class="text-xs text-gray-500">
            Updated {lastUpdated.toLocaleTimeString()}
          </p>
        {/if}
      </div>
      <div class="flex gap-3">
        <button
          type="button"
          class="rounded-full border border-ponzi-thin px-4 py-2 text-sm font-semibold text-white transition hover:border-white disabled:opacity-40"
          onclick={loadDrops}
          disabled={loading}
        >
          {#if loading}Searching...{:else}Search{/if}
        </button>
        <button
          type="button"
          class="rounded-full border border-ponzi-thin px-4 py-2 text-sm font-semibold text-white transition hover:border-white disabled:opacity-40"
          onclick={loadGlobalMetrics}
          disabled={globalLoading}
        >
          {#if globalLoading}Global metrics...{:else}Global metrics{/if}
        </button>
      </div>
    </div>

    <div class="grid gap-3 md:grid-cols-4">
      <label class="space-y-2 text-sm text-gray-300">
        <div class="space-y-1">
          <span>Neighbor level</span>
          <p class="text-xs text-gray-500">
            Increase to include tiles surrounding the reinjected land.
          </p>
        </div>
        <select
          class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
          bind:value={level}
        >
          <option value="1">Level 1</option>
          <option value="2">Level 2</option>
          <option value="3">Level 3</option>
        </select>
      </label>

      <label class="space-y-2 text-sm text-gray-300">
        <div class="space-y-1">
          <span>Fee rate (bps)</span>
          <p class="text-xs text-gray-500">
            Protocol fee expressed in basis points (1 bps = 0.01%).
          </p>
        </div>
        <input
          type="number"
          class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
          min="0"
          step="10000"
          placeholder="Ej: 250000"
          bind:value={feeRate}
        />
      </label>

      <label class="space-y-2 text-sm text-gray-300">
        <div class="space-y-1">
          <span>Sale fee (bps)</span>
          <p class="text-xs text-gray-500">
            Fee taken from secondary sales (LandBought).
          </p>
        </div>
        <input
          type="number"
          class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
          min="0"
          step="10000"
          placeholder="Ej: 500000"
          bind:value={saleFeeRate}
        />
      </label>

      <label class="space-y-2 text-sm text-gray-300">
        <div class="space-y-1">
          <span>Reinjector</span>
          <p class="text-xs text-gray-500">
            Choose the drop wallet you want to analyze.
          </p>
        </div>
        {#if dropWallets.length > 1}
          <select
            class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
            bind:value={reinjector}
          >
            {#each dropWallets as wallet}
              <option value={wallet}>{shortenHex(wallet)}</option>
            {/each}
          </select>
        {:else}
          <input
            type="text"
            class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
            placeholder="0x1234…"
            bind:value={reinjector}
          />
        {/if}
      </label>
    </div>

    <div class="grid gap-3 md:grid-cols-4 text-sm text-gray-300">
      <label class="space-y-2">
        <div class="space-y-1">
          <span>Location</span>
          <p class="text-xs text-gray-500">
            Coordinates (x,y), decimal ID or hexadecimal (0x) value.
          </p>
        </div>
        <input
          type="text"
          class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
          placeholder="32,64 · 500 · 0x1f4"
          bind:value={locationFilter}
        />
      </label>

      <label class="space-y-2">
        <div class="space-y-1">
          <span>From</span>
          <p class="text-xs text-gray-500">
            Start date (UTC 00:00). Use YYYY-MM-DD or MM/DD/YYYY.
          </p>
        </div>
        <input
          type="date"
          class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
          bind:value={since}
        />
      </label>

      <label class="space-y-2">
        <div class="space-y-1">
          <span>To</span>
          <p class="text-xs text-gray-500">
            End date (UTC 23:59). Use YYYY-MM-DD or MM/DD/YYYY.
          </p>
        </div>
        <input
          type="date"
          class="w-full rounded-lg bg-slate-900 px-3 py-2 text-white"
          bind:value={until}
        />
      </label>
    </div>

    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-xl bg-black/40 px-4 py-3 text-xs text-gray-300">
        <p class="text-5xl font-bold text-white">{filteredDrops.length}</p>
        <p class="text-gray-400">Visible drops</p>
      </div>
      <div class="rounded-xl bg-black/40 px-4 py-3 text-xs text-gray-300">
        <p class="text-5xl font-bold text-white">{activeDrops}</p>
        <p class="text-gray-400">Active drops</p>
      </div>
      <div class="rounded-xl bg-black/40 px-4 py-3 text-xs text-gray-300">
        <p class="text-5xl font-bold text-white">{formatRoi(averageRoi)}</p>
        <p class="text-gray-400">Average ROI</p>
      </div>
    </div>

  </div>
</Card>

<Card class="shadow-ponzi mt-4 bg-black/40">
  <div class="space-y-4">
    <div
      class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p class="text-xs uppercase tracking-wide text-gray-400">
          Global metrics (per token)
        </p>
        <p class="text-sm text-gray-300">
          Uses the same filters (reinjector, level, fee, dates). Raw ROI comes from the API; USD ROI uses your token prices.
        </p>
        {#if globalLastUpdated}
          <p class="text-xs text-gray-500">
            Updated {globalLastUpdated.toLocaleTimeString()}
          </p>
        {/if}
      </div>
      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-400">
        <span class="rounded-full border border-white/10 px-3 py-1">
          Level {level}
        </span>
        <span class="rounded-full border border-white/10 px-3 py-1">
          Fee {feeRate.toLocaleString()} bps
        </span>
        <span class="rounded-full border border-white/10 px-3 py-1">
          Sale fee {saleFeeRate.toLocaleString()} bps
        </span>
        <span class="rounded-full border border-white/10 px-3 py-1">
          {since ? `From ${since}` : 'From start'}
        </span>
        <span class="rounded-full border border-white/10 px-3 py-1">
          {until ? `To ${until}` : 'To latest'}
        </span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#if globalCopyStatusMessage}
          <span
            class={`text-xs ${
              globalCopyStatus === 'error'
                ? 'text-rose-300'
                : 'text-emerald-300'
            }`}
          >
            {globalCopyStatusMessage}
          </span>
        {/if}
        <button
          type="button"
          class="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:border-white disabled:opacity-40"
          onclick={() => (showGlobalRawResponse = !showGlobalRawResponse)}
          disabled={!globalResponseJson}
        >
          {showGlobalRawResponse ? 'Hide JSON' : 'Show JSON'}
        </button>
        <button
          type="button"
          class="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:border-white disabled:opacity-40"
          onclick={copyGlobalResponseJson}
          disabled={!globalResponseJson}
        >
          Copy JSON
        </button>
      </div>
    </div>

    {#if globalLoading}
      <div class="rounded-xl border border-dashed border-white/20 p-4 text-center text-sm text-gray-300">
        Loading global metrics...
      </div>
    {:else if globalError}
      <div class="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">
        {globalError}
      </div>
    {:else if !globalMetrics}
      <div class="rounded-xl border border-white/10 p-4 text-sm text-gray-300">
        Click “Global metrics” to see per-token aggregates with the current filters.
      </div>
    {:else}
      {#if showGlobalRawResponse}
        <pre class="rounded-xl bg-slate-950/70 p-3 text-[11px] leading-5 text-emerald-100 overflow-auto">
{globalResponseJson}
        </pre>
      {/if}
      <div class="grid gap-3 sm:grid-cols-4">
        <div class="rounded-xl bg-black/30 p-3 text-sm text-gray-300">
          <p class="text-xs text-gray-500">Total claim fees (USD)</p>
          <p class="font-semibold text-emerald-300 text-lg">
            {totalFeesUsd ? `$${totalFeesUsd.toString()} USDC` : '—'}
          </p>
        </div>
        <div class="rounded-xl bg-black/30 p-3 text-sm text-gray-300">
          <p class="text-xs text-gray-500">Sale fees (USD)</p>
          <p class="font-semibold text-emerald-300 text-lg">
            {totalSaleFeesUsd
              ? `$${totalSaleFeesUsd.toString()} USDC`
              : '—'}
          </p>
        </div>
        <div class="rounded-xl bg-black/30 p-3 text-sm text-gray-300">
          <p class="text-xs text-gray-500">Total distributed (USD)</p>
          <p class="font-semibold text-rose-300 text-lg">
            {totalDistributedUsd
              ? `$${totalDistributedUsd.toString()} USDC`
              : '—'}
          </p>
        </div>
        <div class="rounded-xl bg-black/30 p-3 text-sm text-gray-300">
          <p class="text-xs text-gray-500">
            ROI (Net: (Received - Distributed) / Distributed)
          </p>
          <p
            class={`font-semibold ${
              globalUsdRoi === null
                ? 'text-white'
                : globalUsdRoi >= 0
                  ? 'text-emerald-300'
                  : 'text-rose-300'
            }`}
          >
            USD: {globalUsdRoi !== null ? formatRoi(globalUsdRoi) : '—'}
          </p>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-xl bg-black/30 p-3 text-sm text-gray-300">
          <p class="text-xs text-gray-500">Total inflows (USD)</p>
          <p class="font-semibold text-emerald-300 text-lg">
            {totalInflowsUsd
              ? `$${totalInflowsUsd.toString()} USDC`
              : '—'}
          </p>
        </div>
        <div class="rounded-xl bg-black/30 p-3 text-sm text-gray-300">
          <p class="text-xs text-gray-500">Influenced auctions</p>
          <p class="font-semibold text-white text-lg">
            {#if totalAuctionsAmount}
              {totalAuctionsAmount.toString()}
              {#if mainCurrencyToken}
                <span class="text-xs text-gray-400">
                  {mainCurrencyToken.symbol}
                </span>
              {/if}
            {:else}
              —
            {/if}
          </p>
          {#if totalAuctionsUsd}
            <p class="text-xs text-emerald-200">
              ≈ ${totalAuctionsUsd.toString()} USDC
            </p>
          {/if}
        </div>
      </div>

      <div class="rounded-xl border border-white/5 bg-black/30 p-4">
        <div class="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
          <p>Per token breakdown</p>
          <span class="text-[11px] text-gray-500">
            Fees = neighbor inflows × fee rate; Inflows = taxes received by drops; Distributed = stake paid out
          </span>
        </div>
        {#if globalTokenRows.length === 0}
          <p class="mt-3 text-xs text-gray-500">No data for the selected filters.</p>
        {:else}
          <div class="mt-3 overflow-x-auto">
            <table class="min-w-full text-left text-xs text-gray-200">
              <thead class="text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th class="py-2 pr-4">Token</th>
                  <th class="py-2 pr-4">Fees</th>
                  <th class="py-2 pr-4">Sale fees</th>
                  <th class="py-2 pr-4">Inflows</th>
                  <th class="py-2 pr-4">Distributed</th>
                  <th class="py-2 pr-4">Fees ≈ USD</th>
                  <th class="py-2 pr-4">Sale fees ≈ USD</th>
                  <th class="py-2 pr-4">Inflows ≈ USD</th>
                  <th class="py-2">Distributed ≈ USD</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/5">
                {#each globalTokenRows as row}
                  <tr>
                    <td class="py-2 pr-4 font-semibold">{row.label}</td>
                    <td class="py-2 pr-4 font-mono text-white">
                      {row.feesFormatted}
                    </td>
                    <td class="py-2 pr-4 font-mono text-white">
                      {row.saleFeesFormatted}
                    </td>
                    <td class="py-2 pr-4 font-mono text-white">
                      {row.inflowsFormatted}
                    </td>
                    <td class="py-2 pr-4 font-mono text-rose-200">
                      {row.distributedFormatted}
                    </td>
                    <td class="py-2 pr-4 text-emerald-200">
                      {row.feesUsdFormatted
                        ? `$${row.feesUsdFormatted} USDC`
                        : '—'}
                    </td>
                    <td class="py-2 pr-4 text-emerald-200">
                      {row.saleFeesUsdFormatted
                        ? `$${row.saleFeesUsdFormatted} USDC`
                        : '—'}
                    </td>
                    <td class="py-2 pr-4 text-emerald-200">
                      {row.inflowsUsdFormatted
                        ? `$${row.inflowsUsdFormatted} USDC`
                        : '—'}
                    </td>
                    <td class="py-2 text-emerald-200">
                      {row.distributedUsdFormatted
                        ? `$${row.distributedUsdFormatted} USDC`
                        : '—'}
                    </td>
                  </tr>
                {/each}
                <tr class="border-t border-white/10">
                  <td class="py-2 pr-4 text-right text-[11px] uppercase text-gray-500" colspan="5">
                    Totals (USD)
                  </td>
                  <td class="py-2 pr-4 font-semibold text-emerald-200">
                    {totalFeesUsd ? `$${totalFeesUsd.toString()} USDC` : '—'}
                  </td>
                  <td class="py-2 pr-4 font-semibold text-emerald-200">
                    {totalSaleFeesUsd
                      ? `$${totalSaleFeesUsd.toString()} USDC`
                      : '—'}
                  </td>
                  <td class="py-2 pr-4 font-semibold text-emerald-200">
                    {totalInflowsUsd
                      ? `$${totalInflowsUsd.toString()} USDC`
                      : '—'}
                  </td>
                  <td class="py-2 font-semibold text-rose-200">
                    {totalDistributedUsd
                      ? `$${totalDistributedUsd.toString()} USDC`
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</Card>

<div class="mt-6 space-y-4">
  <p class="text-xs text-gray-500">
    DEBUG — loading: {loading ? 'true' : 'false'}, error: {error || 'none'}, drops: {drops.length}, filtered: {filteredDrops.length}
  </p>
  <div class="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-gray-200">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs uppercase tracking-wide text-gray-400">
          Raw API response
        </p>
        {#if reinjector}
          <p class="text-[13px] text-gray-400">
            Last response from <code>/drops/{shortenHex(reinjector)}</code>
          </p>
        {:else}
          <p class="text-[13px] text-gray-400">
            Latest response from the drops endpoint
          </p>
        {/if}
      </div>
      <div class="flex flex-wrap items-center gap-2">
        {#if copyStatusMessage}
          <span
            class={`text-xs ${
              copyStatus === 'error' ? 'text-rose-300' : 'text-emerald-300'
            }`}
          >
            {copyStatusMessage}
          </span>
        {/if}
        <button
          type="button"
          class="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:border-white disabled:opacity-40"
          onclick={() => (showRawResponse = !showRawResponse)}
        >
          {showRawResponse ? 'Hide JSON' : 'Show JSON'}
        </button>
        <button
          type="button"
          class="rounded-full border border-white/30 px-3 py-1 text-xs font-semibold text-white transition hover:border-white disabled:opacity-40"
          onclick={copyDropResponseJson}
          disabled={!drops.length}
        >
          Copy JSON
        </button>
      </div>
    </div>
    {#if showRawResponse}
      <pre class="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950/70 p-3 text-[11px] leading-5 text-emerald-100">{dropResponseJson}</pre>
    {/if}
  </div>
  {#if loading}
    <div
      class="rounded-xl border border-dashed border-white/20 p-4 text-center text-sm text-gray-300"
    >
      Loading drop data...
    </div>
  {:else if error}
    <div
      class="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200"
    >
      {error}
    </div>
  {:else if filteredDrops.length === 0}
    <div class="rounded-xl border border-white/20 p-4 text-sm text-gray-300">
      No drops match the current filters. (drops: {drops.length}, filtered: {filteredDrops.length})
    </div>
  {:else}
    <div class="grid gap-4">
      {#each filteredDrops as drop}
        {@const inflowRows = buildTokenRows(drop.token_inflows, drop.stake_token)}
        {@const inflowUsdTotal = sumUsdFromRows(inflowRows)}
        {@const areaFeeRows = buildTokenRows(
          drop.area_protocol_fees_total,
          drop.stake_token,
        )}
        {@const areaFeesUsdTotal = sumUsdFromRows(areaFeeRows)}
        {@const saleFeeRows = buildTokenRows(
          drop.sale_protocol_fees_total,
          drop.stake_token,
        )}
        {@const saleFeesUsdTotal = sumUsdFromRows(saleFeeRows)}
        {@const fallbackTokenAddress = drop.stake_token}
        {@const initialUsd = toUsdCurrencyAmount(
          drop.stake_token,
          drop.drop_initial_stake,
          fallbackTokenAddress,
        )}
        {@const remainingUsd = toUsdCurrencyAmount(
          drop.stake_token,
          drop.drop_remaining_stake,
          fallbackTokenAddress,
        )}
        {@const distributedUsd = toUsdCurrencyAmount(
          drop.stake_token,
          drop.drop_distributed_total,
          fallbackTokenAddress,
        )}
        {@const auctionsAmount = toMainCurrencyAmount(
          drop.influenced_auctions_total,
        )}
        {@const auctionsUsd = convertMainCurrencyToUsd(auctionsAmount)}
        {@const combinedPositiveUsd = sumCurrencyAmounts(
          inflowUsdTotal,
          auctionsUsd,
          areaFeesUsdTotal,
          saleFeesUsdTotal,
        )}
        {@const netUsdTotal = subtractCurrencyAmounts(
          combinedPositiveUsd,
          distributedUsd,
        )}
        {@const netUsdIsPositive =
          !!netUsdTotal && netUsdTotal.rawValue().isGreaterThan(0)}
        {@const netUsdIsNegative =
          !!netUsdTotal && netUsdTotal.rawValue().isLessThan(0)}
        <Card
          class="shadow-ponzi bg-gradient-to-br from-slate-900 to-slate-950 p-4"
        >
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="text-xs uppercase text-gray-400">Location</p>
              <p class="text-lg font-semibold text-white">
                {formatLocation(drop.land_location)}
              </p>
            </div>
            <div class="flex items-center gap-3 text-xs">
              <span class="text-gray-400">
                ROI {formatRoi(drop.drop_roi)}
              </span>
              <span
                class={`rounded-full px-3 py-1 font-semibold ${
                  drop.is_active
                    ? 'bg-emerald-600 text-emerald-50'
                    : 'bg-rose-500/80 text-rose-50'
                }`}
              >
                {drop.is_active ? 'Active' : 'Completed'}
              </span>
            </div>
          </div>

          <div class="mt-4 rounded-2xl border border-white/5 bg-black/40 p-4 text-center">
            <p class="text-xs uppercase tracking-wide text-gray-400">
              Net total impact
            </p>
            <p
              class={`mt-2 text-4xl font-extrabold ${
                netUsdTotal
                  ? netUsdIsPositive
                    ? 'text-emerald-400'
                    : netUsdIsNegative
                      ? 'text-rose-400'
                      : 'text-white'
                  : 'text-gray-500'
              }`}
            >
              {netUsdTotal ? `$${netUsdTotal.toString()} USDC` : 'Total unavailable'}
            </p>
            <p class="mt-1 text-[11px] text-gray-500">
              Token inflows + auctions + protocol fees - distributed stake
            </p>
          </div>

          <div
            class="mt-4 grid gap-3 text-sm text-gray-300 sm:grid-cols-2 md:grid-cols-3"
          >
            <div>
              <p class="text-xs text-gray-500">Stake token</p>
              <p class="text-white">{getTokenLabel(drop.stake_token)}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Bought</p>
              <p class="text-white">{formatTimestamp(drop.time_bought)}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Close date</p>
              <p class="text-white">{formatTimestamp(drop.close_date)}</p>
            </div>
            <div>
              <p class="text-xs text-gray-500">Token inflows</p>
              <p class="text-white">{inflowRows.length} tokens</p>
            </div>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-4">
            <div class="rounded-xl bg-black/30 p-3 text-sm">
              <p class="text-xs text-gray-400">Initial stake</p>
              <p class="font-mono text-white">
                {formatTokenAmount(
                  drop.stake_token,
                  drop.drop_initial_stake,
                  fallbackTokenAddress,
                )}
              </p>
              {#if initialUsd}
                <p class="text-xs text-emerald-200">
                  ≈ ${initialUsd.toString()} USDC
                </p>
              {/if}
            </div>
            <div class="rounded-xl bg-black/30 p-3 text-sm">
              <p class="text-xs text-gray-400">Remaining stake</p>
              <p class="font-mono text-white">
                {formatTokenAmount(
                  drop.stake_token,
                  drop.drop_remaining_stake,
                  fallbackTokenAddress,
                )}
              </p>
              {#if remainingUsd}
                <p class="text-xs text-emerald-200">
                  ≈ ${remainingUsd.toString()} USDC
                </p>
              {/if}
            </div>
            <div class="rounded-xl bg-black/30 p-3 text-sm">
              <p class="text-xs text-gray-400">Distributed</p>
              <p class="font-mono text-white">
                {formatTokenAmount(
                  drop.stake_token,
                  drop.drop_distributed_total,
                  fallbackTokenAddress,
                )}
              </p>
              {#if distributedUsd}
                <p class="text-xs text-emerald-200">
                  ≈ ${distributedUsd.toString()} USDC
                </p>
              {/if}
            </div>
            <div class="rounded-xl bg-black/30 p-3 text-sm">
              <p class="text-xs text-gray-400">
                Influenced auctions ({mainCurrencyToken
                  ? mainCurrencyToken.symbol
                  : shortenHex(mainCurrencyAddress ?? '0x0')})
              </p>
              <p class="font-mono text-white">
                {#if auctionsAmount}
                  {auctionsAmount.toString()}
                  {#if mainCurrencyToken}
                    <span class="text-xs text-gray-400">
                      {mainCurrencyToken.symbol}
                    </span>
                  {/if}
                {:else}
                  {hexToDecimal(drop.influenced_auctions_total)}
                {/if}
              </p>
              {#if auctionsUsd}
                <p class="text-xs text-emerald-200">
                  ≈ ${auctionsUsd.toString()} USDC
                </p>
              {/if}
            </div>
          </div>

          <div class="mt-6 grid gap-4 text-sm md:grid-cols-2">
            <div class="rounded-xl bg-black/30 p-4">
              <div class="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                <p>Token inflows</p>
                {#if inflowUsdTotal}
                  <span class="text-emerald-200">
                    Total ≈ ${inflowUsdTotal.toString()} USDC
                  </span>
                {/if}
              </div>
              {#if inflowRows.length === 0}
                <p class="mt-3 text-xs text-gray-500">No tokens received yet.</p>
              {:else}
                <div class="mt-3 overflow-x-auto">
                  <table class="min-w-full text-left text-xs text-gray-200">
                    <thead class="text-[11px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th class="py-2 pr-4">Token</th>
                        <th class="py-2 pr-4">Amount</th>
                        <th class="py-2">≈ USD</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      {#each inflowRows as row}
                        <tr>
                          <td class="py-2 pr-4 font-semibold">{row.label}</td>
                          <td class="py-2 pr-4 font-mono text-white">
                            {row.amountFormatted}
                          </td>
                          <td class="py-2 text-emerald-200">
                            {row.usdFormatted
                              ? `$${row.usdFormatted} USDC`
                              : '—'}
                          </td>
                        </tr>
                      {/each}
                      <tr class="border-t border-white/10">
                        <td class="py-2 pr-4 text-right text-[11px] uppercase text-gray-500" colspan="2">
                          Total (USD)
                        </td>
                        <td class="py-2 font-semibold text-emerald-200">
                          {inflowUsdTotal
                            ? `$${inflowUsdTotal.toString()} USDC`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            <div class="rounded-xl bg-black/30 p-4">
              <div class="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                <p>Area protocol fees</p>
                {#if areaFeesUsdTotal}
                  <span class="text-emerald-200">
                    Total ≈ ${areaFeesUsdTotal.toString()} USDC
                  </span>
                {/if}
              </div>
              {#if areaFeeRows.length === 0}
                <p class="mt-3 text-xs text-gray-500">No fees collected.</p>
              {:else}
                <div class="mt-3 overflow-x-auto">
                  <table class="min-w-full text-left text-xs text-gray-200">
                    <thead class="text-[11px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th class="py-2 pr-4">Token</th>
                        <th class="py-2 pr-4">Amount</th>
                        <th class="py-2">≈ USD</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      {#each areaFeeRows as row}
                        <tr>
                          <td class="py-2 pr-4 font-semibold">{row.label}</td>
                          <td class="py-2 pr-4 font-mono text-white">
                            {row.amountFormatted}
                          </td>
                          <td class="py-2 text-emerald-200">
                            {row.usdFormatted
                              ? `$${row.usdFormatted} USDC`
                              : '—'}
                          </td>
                        </tr>
                      {/each}
                      <tr class="border-t border-white/10">
                        <td class="py-2 pr-4 text-right text-[11px] uppercase text-gray-500" colspan="2">
                          Total (USD)
                        </td>
                        <td class="py-2 font-semibold text-emerald-200">
                          {areaFeesUsdTotal
                            ? `$${areaFeesUsdTotal.toString()} USDC`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
            <div class="rounded-xl bg-black/30 p-4">
              <div class="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
                <p>Sale fees</p>
                {#if saleFeesUsdTotal}
                  <span class="text-emerald-200">
                    Total ≈ ${saleFeesUsdTotal.toString()} USDC
                  </span>
                {/if}
              </div>
              {#if saleFeeRows.length === 0}
                <p class="mt-3 text-xs text-gray-500">No sale fees collected.</p>
              {:else}
                <div class="mt-3 overflow-x-auto">
                  <table class="min-w-full text-left text-xs text-gray-200">
                    <thead class="text-[11px] uppercase tracking-wide text-gray-500">
                      <tr>
                        <th class="py-2 pr-4">Token</th>
                        <th class="py-2 pr-4">Amount</th>
                        <th class="py-2">≈ USD</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-white/5">
                      {#each saleFeeRows as row}
                        <tr>
                          <td class="py-2 pr-4 font-semibold">{row.label}</td>
                          <td class="py-2 pr-4 font-mono text-white">
                            {row.amountFormatted}
                          </td>
                          <td class="py-2 text-emerald-200">
                            {row.usdFormatted
                              ? `$${row.usdFormatted} USDC`
                              : '—'}
                          </td>
                        </tr>
                      {/each}
                      <tr class="border-t border-white/10">
                        <td class="py-2 pr-4 text-right text-[11px] uppercase text-gray-500" colspan="2">
                          Total (USD)
                        </td>
                        <td class="py-2 font-semibold text-emerald-200">
                          {saleFeesUsdTotal
                            ? `$${saleFeesUsdTotal.toString()} USDC`
                            : '—'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              {/if}
            </div>
          </div>
        </Card>
      {/each}
    </div>
  {/if}
</div>
