<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { writable } from 'svelte/store';
  import { useAccount } from '$lib/contexts/account.svelte';
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
  import {
    applyOptimisticDeductions,
    rollbackOptimisticDeductions,
    confirmOptimisticDeductions,
  } from '$lib/utils/optimistic-balance';

  let { land }: { land: LandWithActions } = $props();

  let accountManager = useAccount();
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
    let optimisticTxId: string | null = null;

    try {
      let amountToAdd = CurrencyAmount.fromScaled(stakeIncrease, land.token);

      // Apply optimistic balance deduction before transaction
      if (land.token) {
        optimisticTxId = applyOptimisticDeductions([
          {
            tokenAddress: land.token.address,
            amount: amountToAdd,
          },
        ]);
      }

      let result = await land.increaseStake(amountToAdd);
      if (result?.transaction_hash) {
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();

        const txReceipt = await Promise.any([txPromise, landPromise]);

        // Check if transaction failed (only if txPromise resolved first)
        if (
          txReceipt &&
          typeof txReceipt === 'object' &&
          'statusReceipt' in txReceipt &&
          txReceipt.statusReceipt !== 'SUCCEEDED'
        ) {
          if (optimisticTxId) {
            rollbackOptimisticDeductions(optimisticTxId);
          }
          throw new Error(
            `Transaction failed with status: ${txReceipt.statusReceipt}`,
          );
        }

        // Confirm optimistic update on success
        if (optimisticTxId) {
          confirmOptimisticDeductions(optimisticTxId);
        }

        // the new stake amount should be current + new stake amount
        land.stakeAmount.setToken(land.token);
        const currentStake =
          land.stakeAmount || CurrencyAmount.fromScaled('0', land.token);
        amountToAdd = currentStake.add(amountToAdd);

        // Update the land stake
        const parsedStake = {
          entityId: land.location,
          models: {
            ponzi_land: {
              LandStake: {
                location: land.location,
                amount: amountToAdd.toBignumberish(),
                last_pay_time: Date.now() / 1000,
              },
            },
          },
        };
        console.log('Parsed stake update:', parsedStake);
        landStore.updateLand(parsedStake);
      }
    } catch (error) {
      // Rollback optimistic balance on any error
      if (optimisticTxId) {
        rollbackOptimisticDeductions(optimisticTxId);
      }
      console.error('Error increasing stake:', error);
    } finally {
      isLoading = false;
    }
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
