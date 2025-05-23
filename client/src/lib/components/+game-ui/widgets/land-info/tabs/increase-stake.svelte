<script lang="ts">
  import type { LandWithActions } from '$lib/api/land';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { writable } from 'svelte/store';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let { land }: { land: LandWithActions } = $props();

  let accountManager = useAccount();
  let disabled = writable(false);
  let stakeIncrease = $state('100');

  const handleIncreaseStake = async () => {
    if (!land) {
      console.error('No land selected');
      return;
    }

    let result = await land.increaseStake(
      CurrencyAmount.fromScaled(stakeIncrease, land.token),
    );
    disabled.set(true);
    if (result?.transaction_hash) {
      const txPromise = accountManager!
        .getProvider()
        ?.getWalletAccount()
        ?.waitForTransaction(result.transaction_hash);
      const landPromise = land.wait();

      await Promise.any([txPromise, landPromise]);
      disabled.set(false);
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
    <Button disabled={$disabled} on:click={handleIncreaseStake} class="w-full">
      Confirm Stake
    </Button>
  </div>
</div>
