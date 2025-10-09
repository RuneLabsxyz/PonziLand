<script lang="ts">
  import account from '$lib/account.svelte';
  import type { LandWithActions, NextClaimInformation } from '$lib/api/land';
  import { AuctionLand } from '$lib/api/land/auction_land';
  import { Button } from '$lib/components/ui/button';
  import TokenAvatar from '$lib/components/ui/token-avatar/token-avatar.svelte';
  import type {
    LandYieldInfo,
    TabType,
    ElapsedTimeSinceLastClaim,
  } from '$lib/interfaces';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { claimSingleLand } from '$lib/stores/claim.store.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress, toHexWithPadding } from '$lib/utils';
  import { displayCurrency } from '$lib/utils/currency';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import data from '$profileData';
  import IncreasePrice from './increase-price.svelte';
  import IncreaseStake from './increase-stake.svelte';
  import { untrack } from 'svelte';

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
  let pendingClaims: NextClaimInformation[] = $state([]);
  let pendingClaimsLoading = $state(false);
  let neighborClaimData: ElapsedTimeSinceLastClaim[] = $state([]);
  let neighborClaimLoading = $state(false);

  const dojo = useDojo();

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

  // Load pending claims data - only when land location or owner status changes
  $effect(() => {
    const landLocation = land?.locationString;
    const ownerStatus = isOwner;

    console.log('Pending claims effect triggered:', {
      landLocation,
      ownerStatus,
    });

    if (!landLocation || !ownerStatus) return;

    untrack(() => {
      pendingClaimsLoading = true;
      land
        .getNextClaim()
        .then((claims) => {
          if (claims) {
            pendingClaims = claims;
          }
          pendingClaimsLoading = false;
        })
        .catch((error) => {
          console.error('Error loading pending claims:', error);
          pendingClaimsLoading = false;
        });
    });
  });

  // Load neighbor claim time data - only when land location or owner status changes
  $effect(() => {
    const landLocation = land?.locationString;
    const ownerStatus = isOwner;

    console.log('Neighbor claims effect triggered:', {
      landLocation,
      ownerStatus,
    });

    if (!landLocation || !ownerStatus) return;

    untrack(() => {
      neighborClaimLoading = true;
      land
        .getElapsedTimeSinceLastClaimForNeighbors()
        .then((elapsedTimes) => {
          if (elapsedTimes) {
            neighborClaimData = elapsedTimes;
          }
          neighborClaimLoading = false;
        })
        .catch((error) => {
          console.error('Error loading neighbor claim data:', error);
          neighborClaimLoading = false;
        });
    });
  });

  function formatElapsedTime(elapsedSeconds: bigint): string {
    const seconds = Number(elapsedSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h ago`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  }

  function getMostRecentNeighborClaim(): {
    location: string;
    timeAgo: string;
  } | null {
    if (neighborClaimData.length === 0) return null;

    // Find the most recent claim (shortest elapsed time)
    const mostRecent = neighborClaimData.reduce((prev, current) =>
      current[1] < prev[1] ? current : prev,
    );

    return {
      location: mostRecent[0].toString(),
      timeAgo: formatElapsedTime(mostRecent[1]),
    };
  }

  async function handleClaimSingle() {
    if (!account.address || !account.walletAccount) return;
    try {
      await claimSingleLand(land, dojo, account.walletAccount);

      // Refresh both pending claims and neighbor claim data after successful claim
      const [claims, elapsedTimes] = await Promise.all([
        land.getNextClaim(),
        land.getElapsedTimeSinceLastClaimForNeighbors(),
      ]);

      if (claims) {
        pendingClaims = claims;
      }
      if (elapsedTimes) {
        neighborClaimData = elapsedTimes;
      }
    } catch (error) {
      console.error('Error claiming:', error);
    }
  }
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

      {#if isOwner}
        {@const lastClaimTime = land.neighborsInfo?.earliestClaimNeighborTime}
        {#if lastClaimTime && lastClaimTime > 0}
          {@const elapsedMs = Date.now() - lastClaimTime}
          {@const timeAgo = formatElapsedTime(
            BigInt(Math.floor(elapsedMs / 1000)),
          )}
          <div class="flex justify-between items-center">
            <div class="opacity-50">This Land's Last Claim</div>
            <div class="text-sm">{timeAgo}</div>
          </div>
        {:else}
          <div class="flex justify-between items-center">
            <div class="opacity-50">This Land's Last Claim</div>
            <div class="text-sm opacity-50">No claims yet</div>
          </div>
        {/if}

        {@const recentNeighborClaim = getMostRecentNeighborClaim()}
        {#if neighborClaimLoading}
          <div class="flex justify-between items-center">
            <div class="opacity-50">Last Neighbor Claim</div>
            <div class="opacity-50 text-sm">Loading...</div>
          </div>
        {:else if recentNeighborClaim}
          <div class="flex justify-between items-center">
            <div class="opacity-50">Last Neighbor Claim</div>
            <div class="text-sm">
              Land {Number(recentNeighborClaim.location)} - {recentNeighborClaim.timeAgo}
            </div>
          </div>
        {:else}
          <div class="flex justify-between items-center">
            <div class="opacity-50">Last Neighbor Claim</div>
            <div class="text-sm opacity-50">No neighbor claims yet</div>
          </div>
        {/if}
      {/if}

      {#if isOwner && (pendingClaims.length > 0 || pendingClaimsLoading)}
        <div class="w-full flex gap-2 items-center opacity-50 mt-2">
          <div class="flex-1 h-[1px] bg-white"></div>
          <div class="">Pending Claims</div>
          <div class="flex-1 h-[1px] bg-white"></div>
        </div>

        {#if pendingClaimsLoading}
          <div class="flex justify-center items-center py-2">
            <div class="opacity-50">Loading pending claims...</div>
          </div>
        {:else if pendingClaims.length > 0}
          <div class="flex flex-col gap-1">
            {#each pendingClaims as claim}
              {@const claimToken = data.availableTokens.find(
                (token) => token.address === claim.tokenAddress,
              )}
              <div class="flex justify-between items-center">
                <div class="flex items-center gap-2 opacity-50">
                  <div class="text-sm">
                    From land {Number(claim.landLocation)}
                  </div>
                  {#if claim.canBeNuked}
                    <div class="text-xs text-red-500">(Can be nuked)</div>
                  {/if}
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-green-500">+{claim.amount.toString()}</span>
                  {#if claimToken}
                    <TokenAvatar
                      token={claimToken}
                      class="border border-white w-4 h-4"
                    />
                  {/if}
                </div>
              </div>
            {/each}
            <div class="flex justify-center mt-2">
              <Button onclick={handleClaimSingle} size="sm" class="text-xs">
                Claim All
              </Button>
            </div>
          </div>
        {:else}
          <div class="flex justify-center items-center py-2">
            <div class="opacity-50 text-sm">No pending claims</div>
          </div>
        {/if}
      {/if}
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
