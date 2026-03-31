<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { displayCurrency } from '$lib/utils/currency';
  import data from '$profileData';

  interface Props {
    lands: LandWithActions[];
  }

  let { lands }: Props = $props();

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  let portfolioStats = $derived.by(() => {
    if (!baseToken || !lands.length)
      return { totalStakedUsd: 0, totalSellValueUsd: 0 };

    let totalStakedUsd = 0;
    let totalSellValueUsd = 0;

    for (const land of lands) {
      const token = land.token;
      if (!token) continue;

      // Stake
      if (land.stakeAmount) {
        const stakedUsd = walletStore.convertTokenAmount(
          land.stakeAmount,
          token,
          baseToken,
        );
        if (stakedUsd) totalStakedUsd += Number(stakedUsd.rawValue());
      }
      // Sell value
      if (land.sellPrice) {
        const sellUsd = walletStore.convertTokenAmount(
          land.sellPrice,
          token,
          baseToken,
        );
        if (sellUsd) totalSellValueUsd += Number(sellUsd.rawValue());
      }
    }

    return { totalStakedUsd, totalSellValueUsd };
  });
</script>

<div class="flex flex-col gap-3">
  <div class="text-sm font-semibold opacity-70 flex items-center gap-2">
    <img src="/ui/icons/IconTiny_Stats.png" alt="Stats" class="h-4 w-4" />
    Portfolio Value
  </div>

  {#if lands.length === 0}
    <div class="text-center text-sm opacity-50">No lands owned</div>
  {:else}
    <div class="bg-black/20 rounded-lg p-3">
      <div class="grid grid-cols-2 gap-4">
        <div class="text-center">
          <div class="text-xs opacity-50">Total Staked</div>
          <div class="font-ponzi-number text-lg">
            {displayCurrency(portfolioStats.totalStakedUsd)} $
          </div>
        </div>
        <div class="text-center">
          <div class="text-xs opacity-50">Total Sell Value</div>
          <div class="font-ponzi-number text-lg">
            {displayCurrency(portfolioStats.totalSellValueUsd)} $
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
