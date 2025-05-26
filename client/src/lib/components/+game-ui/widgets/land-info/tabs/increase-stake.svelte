<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { writable } from 'svelte/store';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { tokenStore } from '$lib/stores/tokens.store.svelte';

  let { land }: { land: LandWithActions } = $props();

  let accountManager = useAccount();
  let disabled = writable(false);
  let stakeIncrease = $state('0.1');

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
    let result = await land.increaseStake(
      CurrencyAmount.fromScaled(stakeIncrease, land.token),
    );
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();

      await Promise.any([txPromise, landPromise]);
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
    />
    {#if stakeError}
      <p class="text-red-500 text-sm">{stakeError}</p>
    {/if}
    <Button
      disabled={$disabled || !isStakeValid}
      on:click={handleIncreaseStake}
      class="w-full"
    >
      Confirm Stake
    </Button>
  </div>
</div>
