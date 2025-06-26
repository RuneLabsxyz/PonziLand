<script lang="ts">
  import account from '$lib/account.svelte';
  import { getTokenPrices } from '$lib/api/defi/ekubo/requests';
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type { LandYieldInfo, TabType } from '$lib/interfaces';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import data from '$profileData';
  import IncreasePrice from './increase-price.svelte';
  import IncreaseStake from './increase-stake.svelte';

  const BASE_TOKEN = data.mainCurrencyAddress;

  let {
    land,
    activeTab = $bindable(),
    isActive = false,
    auctionPrice,
  }: {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
    auctionPrice?: CurrencyAmount;
  } = $props();

  const address = $derived(account.address);
  let isOwner = $derived(
    !!land && !!address && padAddress(land.owner) === padAddress(address),
  );

  let baseToken = $derived(
    data.availableTokens.find((token) => token.address === BASE_TOKEN),
  );

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);
  let tokenPrices = $state<
    { symbol: string; address: string; ratio: number | null }[]
  >([]);
  let formattedYields = $state<
    { amount: string; baseValue: string | CurrencyAmount }[]
  >([]);
  let totalYieldValue: number = $state(0);

  let burnRate = $derived(
    calculateBurnRate(land as LandWithActions, getNumberOfNeighbours() || 0),
  );

  let burnRateInBaseToken: CurrencyAmount = $state(
    CurrencyAmount.fromScaled('0'),
  );

  $effect(() => {
    if (tokenPrices) {
      if (land?.token?.address === BASE_TOKEN) {
        burnRateInBaseToken = CurrencyAmount.fromScaled(
          burnRate.toNumber(),
          land?.token,
        );
      } else {
        const tokenPrice = tokenPrices.find(
          (p) => p.address === land?.token?.address,
        );
        if (tokenPrice) {
          burnRateInBaseToken = CurrencyAmount.fromScaled(
            burnRate.dividedBy(tokenPrice.ratio || 0).toString(),
            land?.token,
          );
        }
      }
    }
  });

  function getNumberOfNeighbours() {
    if (land == undefined) return;
    return yieldInfo?.yield_info.filter((info) => info.percent_rate).length;
  }

  $effect(() => {
    if (land == undefined) return;
    land.getYieldInfo().then((info) => {
      yieldInfo = info;

      // Fetch token prices
      getTokenPrices().then((prices) => {
        tokenPrices = prices;
        let totalValue = 0;
        // Process yield information with prices
        if (yieldInfo?.yield_info) {
          formattedYields = Object.entries(yieldInfo.yield_info).map(
            ([tokenAddress, yieldData]) => {
              // Find token data from data.json
              const tokenHexAddress = toHexWithPadding(yieldData.token);
              const tokenData = data.availableTokens.find(
                (token) => token.address === tokenHexAddress,
              );

              // Format the amount using CurrencyAmount with proper token data
              const amount = CurrencyAmount.fromUnscaled(
                yieldData.per_hour,
                tokenData,
              );

              // Find price ratio for this token
              const priceInfo = tokenPrices.find(
                (p) => p.address === tokenHexAddress,
              );

              // Calculate base token value if ratio exists
              let baseValue = null;
              if (priceInfo?.ratio !== null && priceInfo) {
                const baseAmount = amount
                  .rawValue()
                  .dividedBy(priceInfo.ratio || 0);
                baseValue = CurrencyAmount.fromScaled(
                  baseAmount.toString(),
                ).toString();
                totalValue += Number(
                  amount.rawValue().dividedBy(priceInfo.ratio || 0),
                );
              } else {
                baseValue = amount;
                totalValue += Number(amount.rawValue());
              }

              return {
                amount: amount.toString(),
                baseValue,
              };
            },
          );
        }
        totalYieldValue = totalValue;
      });
    });
  });
</script>

{#if isActive}
  <div class="w-full flex flex-col gap-2">
    <!-- Yields -->
    <div class="flex w-full justify-center select-text">
      <div class="text-center pb-2 text-ponzi-number">
        <span class="opacity-50">Total Tokens Earned</span>
        <div
          class="{totalYieldValue - Number(burnRateInBaseToken.toString()) >= 0
            ? 'text-green-500'
            : 'text-red-500'} text-2xl flex items-center justify-center gap-2"
        >
          <span class="stroke-3d-black">
            {totalYieldValue - Number(burnRateInBaseToken.toString()) >= 0
              ? '+ '
              : '- '}{displayCurrency(
              Math.abs(
                totalYieldValue - Number(burnRateInBaseToken.toString()),
              ),
            )}
          </span>
          <TokenAvatar token={baseToken} class="border border-white w-6 h-6" />
        </div>
      </div>
    </div>
    <div class="flex w-full justify-between select-text">
      <div class="flex flex-col items-center text-ponzi-number">
        <div class="opacity-50 text-sm">Earning / hour :</div>
        <div class="text-green-500 flex items-center gap-2">
          <span class="text-xl stroke-3d-black"
            >+ {displayCurrency(totalYieldValue)}</span
          >
          <TokenAvatar token={baseToken} class="border border-white w-5 h-5" />
        </div>
      </div>
      <div class="flex flex-col items-center text-ponzi-number">
        <div class="opacity-50 text-sm">Burning / hour :</div>
        <div class="text-red-500 flex items-center gap-2">
          <span class="text-xl stroke-3d-black"
            >- {displayCurrency(burnRateInBaseToken.toString())}</span
          >
          <TokenAvatar token={baseToken} class="border border-white w-5 h-5" />
        </div>
      </div>
    </div>

    <!-- Infos -->
    <div class="flex flex-col rounded bg-[#1E1E2D] px-4 pb-2 select-text">
      <div class="w-full flex gap-2 items-center opacity-50">
        <div class="flex-1 h-[1px] bg-white"></div>
        <div class="">Main informations</div>
        <div class="flex-1 h-[1px] bg-white"></div>
      </div>
      <div class="flex justify-between items-center">
        <div class="opacity-50">Token</div>
        <div>{land?.token?.name}</div>
      </div>
      {#if land.type !== 'auction'}
        <div class="flex justify-between items-center">
          <div class="opacity-50">Stake Amount</div>
          <div>{land?.stakeAmount}</div>
        </div>
      {/if}
      <div class="flex justify-between items-center">
        <div class="opacity-50">Sell price</div>
        {#if land.type == 'auction' && auctionPrice}
          <div>
            {auctionPrice.toString()}
          </div>
        {:else}
          <div>{land.sellPrice}</div>
        {/if}
      </div>
    </div>

    <!-- Interaction -->
    {#if isOwner}
      <div class="flex gap-4">
        <div class="w-full">
          <IncreaseStake {land} />
        </div>
        <div class="w-full">
          <IncreasePrice {land} />
        </div>
      </div>
    {:else}
      <Button onclick={() => (activeTab = 'buy')}>BUY</Button>
    {/if}
    <Button onclick={() => (activeTab = 'quests')}>Quests</Button>
  </div>
{/if}
