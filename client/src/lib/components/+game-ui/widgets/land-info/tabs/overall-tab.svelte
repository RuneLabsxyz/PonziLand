<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { Button } from '$lib/components/ui/button';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import { tutorialState } from '$lib/components/tutorial/stores.svelte';
  import type { LandYieldInfo, TabType } from '$lib/interfaces';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import data from '$profileData';
  import IncreasePrice from './increase-price.svelte';
  import IncreaseStake from './increase-stake.svelte';

  interface Props {
    land: LandWithActions;
    activeTab: TabType;
    isActive?: boolean;
    auctionPrice?: CurrencyAmount;
  }

  let {
    land,
    activeTab = $bindable(),
    isActive = false,
    auctionPrice,
  }: Props = $props();

  const address = $derived(account.address);
  let isOwner = $derived(
    !!land && !!address && padAddress(land.owner) === padAddress(address),
  );

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);
  let formattedYields = $state<
    { amount: string; baseValue: string | CurrencyAmount }[]
  >([]);
  let totalYieldValue: number = $state(0);

  let burnRate = $derived(
    calculateBurnRate(land.sellPrice, land.level, getNumberOfNeighbours() || 0),
  );

  let burnRateInBaseToken: CurrencyAmount = $state(
    CurrencyAmount.fromScaled('0'),
  );

  $effect(() => {
    if (land?.token && baseToken) {
      if (land.token.address === baseToken.address) {
        // If land token is already the selected base token, no conversion needed
        burnRateInBaseToken = CurrencyAmount.fromScaled(
          burnRate.toNumber(),
          land.token,
        );
      } else {
        // Convert burn rate from land token to selected base token using wallet store
        const burnRateAmount = CurrencyAmount.fromScaled(
          burnRate.toNumber(),
          land.token,
        );
        const convertedBurnRate = walletStore.convertTokenAmount(
          burnRateAmount,
          land.token,
          baseToken,
        );
        if (convertedBurnRate) {
          burnRateInBaseToken = convertedBurnRate;
        } else {
          // Fallback to zero if conversion fails
          burnRateInBaseToken = CurrencyAmount.fromScaled('0', baseToken);
        }
      }
    }
  });

  function getNumberOfNeighbours() {
    if (land == undefined) return;
    return yieldInfo?.yield_info.filter((info) => info.percent_rate).length;
  }

  $effect(() => {
    // Track tutorial step changes to refresh neighbor data when neighbors spawn
    const _tutorialStep = tutorialState.tutorialStep;

    if (land == undefined || baseToken == undefined) return;
    land.getYieldInfo(false).then((info) => {
      yieldInfo = info;

      let totalValue = 0;
      // Process yield information and convert to base token using wallet store
      if (yieldInfo?.yield_info && baseToken) {
        formattedYields = yieldInfo.yield_info.map((yieldData) => {
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

          // Convert to base token using wallet store's convertTokenAmount
          const baseValue =
            tokenData && baseToken
              ? walletStore.convertTokenAmount(amount, tokenData, baseToken)
              : null;

          let baseValueDisplay;
          if (baseValue) {
            baseValueDisplay = baseValue.toString();
            totalValue += Number(baseValue.rawValue());
          } else {
            // Fallback: if conversion fails, use original amount (assuming it's base token)
            baseValueDisplay = amount;
            totalValue += Number(amount.rawValue());
          }

          return {
            amount: amount.toString(),
            baseValue: baseValueDisplay,
          };
        });
      }
      totalYieldValue = totalValue;
    });
  });
</script>

{#if isActive}
  <div class="w-full flex flex-col gap-2">
    <!-- Yields -->
    <div class="flex w-full justify-center select-text">
      <div class="text-center pb-2 text-ponzi-number">
        <span class="opacity-50"
          >{land.type === 'auction'
            ? 'Potential yield /h'
            : 'Net yield /h'}</span
        >
        {#if land.type !== 'auction'}
          <div
            class="{totalYieldValue - Number(burnRateInBaseToken.toString()) >=
            0
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
            <TokenAvatar
              token={baseToken}
              class="border border-white w-6 h-6"
            />
          </div>
        {:else}
          <div
            class="text-green-500 text-2xl flex items-center justify-center gap-2"
          >
            <span class="stroke-3d-black">
              + {displayCurrency(totalYieldValue)}
            </span>
            <TokenAvatar
              token={baseToken}
              class="border border-white w-6 h-6"
            />
          </div>
        {/if}
      </div>
    </div>
    {#if land.type !== 'auction'}
      <div class="flex w-full justify-between select-text">
        <div class="flex flex-col items-center text-ponzi-number">
          <div class="opacity-50 text-sm">Earning / hour :</div>
          <div class="text-green-500 flex items-center gap-2">
            <span class="text-xl stroke-3d-black"
              >+ {displayCurrency(totalYieldValue)}</span
            >
            <TokenAvatar
              token={baseToken}
              class="border border-white w-5 h-5"
            />
          </div>
        </div>
        <div class="flex flex-col items-center text-ponzi-number">
          <div class="opacity-50 text-sm">Cost / hour :</div>
          <div class="text-red-500 flex items-center gap-2">
            <span class="text-xl stroke-3d-black"
              >- {displayCurrency(burnRateInBaseToken.toString())}</span
            >
            <TokenAvatar
              token={baseToken}
              class="border border-white w-5 h-5"
            />
          </div>
        </div>
      </div>
    {/if}

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
  </div>
{/if}
