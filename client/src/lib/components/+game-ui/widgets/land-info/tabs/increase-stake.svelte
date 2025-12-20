<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { writable } from 'svelte/store';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { walletStore } from '$lib/stores/wallet.svelte';
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';
  import data from '$profileData';
  import {
    nextStep,
    tutorialAttribute,
  } from '$lib/components/tutorial/stores.svelte';
  import { executeTransaction } from '$lib/transactions';

  let { land }: { land: LandWithActions } = $props();

  let disabled = writable(false);
  let stakeIncrease = $state('0.1');
  let isLoading = $state(false);

  let stakeError = $derived.by(() => {
    if (!land || !stakeIncrease) return null;
    try {
      const amount = CurrencyAmount.fromScaled(stakeIncrease, land.token);
      const balanceAmount = walletStore.getBalance(land.token?.address!);
      if (!balanceAmount) return 'Token balance not found';

      if (amount.rawValue().isGreaterThan(balanceAmount.rawValue())) {
        return `Not enough balance to increase stake. Requested: ${amount.toString()}, Available: ${balanceAmount.toString()}`;
      }
      if (amount.rawValue().isLessThanOrEqualTo(0)) {
        return 'Stake amount must be greater than 0';
      }

      const totalStakeAmount = land.stakeAmount.add(amount);
      if (!walletStore.isWithinCap(totalStakeAmount)) {
        let cap = walletStore.getCapForToken(land.token!);
        return `Above the playtest cap! Max is ${cap.toString()} ${land.token!.symbol}`;
      }

      return null;
    } catch {
      return 'Invalid stake value';
    }
  });

  let isStakeValid = $derived(() => !!land && !!stakeIncrease && !stakeError);

  const handleIncreaseStake = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }

    // Handle tutorial
    if (tutorialAttribute('wait_increase_stake').has) {
      nextStep();
      return;
    }

    isLoading = true;
    const amountToAdd = CurrencyAmount.fromScaled(stakeIncrease, land.token);

    await executeTransaction({
      execute: () => land.increaseStake(amountToAdd),
      deductions: land.token
        ? [{ tokenAddress: land.token.address, amount: amountToAdd }]
        : [],
      waitForLand: () => land.wait(),
      notificationName: 'stake',
      onSuccess: () => {
        // Calculate new total stake
        land.stakeAmount.setToken(land.token);
        const currentStake =
          land.stakeAmount || CurrencyAmount.fromScaled('0', land.token);
        const newTotalStake = currentStake.add(amountToAdd);

        // Update the land stake
        landStore.updateLand({
          entityId: land.location,
          models: {
            ponzi_land: {
              LandStake: {
                location: land.location,
                amount: newTotalStake.toBignumberish(),
              },
            },
          },
        });
      },
      onError: (error) => {
        console.error('Error increasing stake:', error);
      },
    });

    isLoading = false;
  };
</script>

<div class="flex flex-col gap-4 w-full">
  <div class="space-y-3">
    <Label>Amount to add to stake</Label>
    <Input
      type="number"
      bind:value={stakeIncrease}
      placeholder="Enter amount"
      disabled={isLoading}
    />
    {#if stakeError}
      <p class="text-red-500 text-sm">{stakeError}</p>
    {/if}
    <Button
      disabled={$disabled || !isStakeValid || isLoading}
      onclick={handleIncreaseStake}
      class="w-full"
    >
      {#if isLoading}
        Processing&nbsp;<ThreeDots />
      {:else}
        Increase Stake
      {/if}
    </Button>
  </div>
</div>
