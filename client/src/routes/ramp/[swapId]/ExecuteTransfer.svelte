<script lang="ts">
  import type { ListTransferDepositAction } from '@layerswap/sdk/resources/swaps/deposit-actions.mjs';
  import { provider } from '$lib/ramp/stores.svelte';
  import { appKit } from '$lib/ramp';
  import { Button } from '$lib/components/ui/button';
  import { BrowserProvider } from 'ethers';
  const {
    action,
    ondone,
  }: {
    action: ListTransferDepositAction.Data;
    ondone: (txHash: string) => void;
  } = $props();

  export async function executeTransfer() {
    const ethersProvider = new BrowserProvider(provider.current!);
    const signer = await ethersProvider.getSigner();

    const tx = await signer.sendTransaction({
      to: action.to_address,
      value: 0,
      data: action.call_data,
    });

    console.log('Transaction sent', tx.hash);

    ondone(tx.hash);

    await tx.wait();

    console.log('Transaction done!');
  }
</script>

<div class="text-xl">
  <h1 class="text-3xl">4. Send the amount</h1>
  {#if provider.current}
    <Button onclick={executeTransfer}>Send</Button>
  {:else}
    <p>To execute the transfer, please connect your wallet.</p>
    <Button onclick={() => appKit.open()}>Connect Wallet</Button>
  {/if}
</div>
