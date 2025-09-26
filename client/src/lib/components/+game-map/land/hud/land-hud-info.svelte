<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import type { LandYieldInfo } from '$lib/interfaces';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { toHexWithPadding } from '$lib/utils';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { calculateBurnRate } from '$lib/utils/taxes';
  import data from '$profileData';
  import LandOverview from '../land-overview.svelte';
  import LandHudNormal from './land-hud-normal.svelte';
  import LandHudPro from './land-hud-pro.svelte';

  let baseToken = $derived.by(() => {
    const selectedAddress = settingsStore.selectedBaseTokenAddress;
    const targetAddress = selectedAddress || data.mainCurrencyAddress;
    return data.availableTokens.find(
      (token) => token.address === targetAddress,
    );
  });

  let {
    land,
    isOwner,
    showLand,
  }: {
    land: LandWithActions;
    isOwner: boolean;
    showLand: boolean;
  } = $props();

  let yieldInfo: LandYieldInfo | undefined = $state(undefined);
  let totalYieldValue: number = $state(0);

  let burnRate = $derived(
    CurrencyAmount.fromScaled(
      calculateBurnRate(
        land.sellPrice,
        land.level,
        getNumberOfNeighbours() || 0,
      ).toNumber(),
      land.token,
    ),
  );

  let burnRateInBaseToken: CurrencyAmount = $state(
    CurrencyAmount.fromScaled('0'),
  );

  $effect(() => {
    if (land?.token && baseToken) {
      if (land.token.address === baseToken.address) {
        // If land token is already the selected base token, no conversion needed
        burnRateInBaseToken = burnRate;
      } else {
        // Convert burn rate from land token to selected base token using wallet store
        const convertedBurnRate = walletStore.convertTokenAmount(
          burnRate,
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
    const nbNeighbors = yieldInfo?.yield_info.filter(
      (info) => info.percent_rate,
    ).length;
    return nbNeighbors;
  }

  $effect(() => {
    if (land == undefined || baseToken == undefined) return;
    land.getYieldInfo(false).then((info) => {
      yieldInfo = info;

      let totalValue = 0;
      // Process yield information and convert to base token using wallet store
      if (yieldInfo?.yield_info && baseToken) {
        for (const yieldData of yieldInfo.yield_info) {
          // Find token data from data.json
          const tokenHexAddress = toHexWithPadding(yieldData.token);
          const tokenData = data.availableTokens.find(
            (token) => token.address === tokenHexAddress,
          );

          if (tokenData) {
            // Format the amount using CurrencyAmount with proper token data
            const amount = CurrencyAmount.fromUnscaled(
              yieldData.per_hour,
              tokenData,
            );

            // Convert to base token using wallet store's convertTokenAmount
            const baseValue = walletStore.convertTokenAmount(
              amount,
              tokenData,
              baseToken,
            );

            if (baseValue) {
              totalValue += Number(baseValue.rawValue());
            } else {
              // Fallback: if conversion fails, use original amount (assuming it's base token)
              totalValue += Number(amount.rawValue());
            }
          }
        }
      }
      totalYieldValue = totalValue;
    });
  });
</script>

<div class="flex flex-row gap-6 px-6">
  {#if showLand}
    <LandOverview {land} {isOwner} />
  {/if}
  {#if settingsStore.isNoobMode}
    <LandHudNormal
      {yieldInfo}
      {totalYieldValue}
      burnRate={burnRateInBaseToken}
      {land}
    />
  {:else if land}
    <LandHudPro {totalYieldValue} burnRate={burnRateInBaseToken} {land} />
  {/if}
</div>
