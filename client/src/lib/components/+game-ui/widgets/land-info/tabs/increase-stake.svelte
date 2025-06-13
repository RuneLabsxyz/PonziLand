<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { writable } from 'svelte/store';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { tokenStore } from '$lib/stores/tokens.store.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import ThreeDots from '$lib/components/loading-screen/three-dots.svelte';

  let { land }: { land: LandWithActions } = $props();

  let accountManager = useAccount();
  let disabled = writable(false);
  let stakeIncrease = $state('0.1');
  let isLoading = $state(false);

  let stakeError = $derived.by(() => {
    if (!land || !stakeIncrease) return null;
    try {
      const amount = CurrencyAmount.fromScaled(stakeIncrease, land.token);
      const tokenBalance = tokenStore.balances.find(
        (b) => b.token.address === land.token?.address,
      );
      if (!tokenBalance) return 'Token balance not found';
      const balanceAmount = CurrencyAmount.fromUnscaled(
        tokenBalance.balance,
        land.token,
      );
      if (amount.rawValue().isGreaterThan(balanceAmount.rawValue())) {
        return `Not enough balance to increase stake. Requested: ${amount.toString()}, Available: ${balanceAmount.toString()}`;
      }
      if (amount.rawValue().isLessThanOrEqualTo(0)) {
        return 'Stake amount must be greater than 0';
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
    isLoading = true;
    try {
      let amountToAdd = CurrencyAmount.fromScaled(stakeIncrease, land.token);
      let result = await land.increaseStake(amountToAdd);
      if (result?.transaction_hash) {
        const txPromise = accountManager!
          .getProvider()
          ?.getWalletAccount()
          ?.waitForTransaction(result.transaction_hash);
        const landPromise = land.wait();

        await Promise.any([txPromise, landPromise]);

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
