<script lang="ts">
  import { PUBLIC_DOJO_CHAIN_ID } from '$env/static/public';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { onMount } from 'svelte';
  import Button from '../ui/button/button.svelte';
  import { Card } from '../ui/card';

  // Get the chain from the wallet
  const accountProvider = useAccount();
  let chainId: string | undefined = $state();

  let visible = $derived(
    chainId && PUBLIC_DOJO_CHAIN_ID.toLowerCase() !== chainId?.toLowerCase(),
  );

  let providerName: string | undefined;

  async function switchNetwork() {
    if (!accountProvider.getProvider()?.getWalletAccount()) {
      // Ask for a login on the good chain, then switch.
      await accountProvider.promptForLogin();
    } else {
      // Get the provider name
      providerName = accountProvider.getProviderName();
      await accountProvider.switchChain(PUBLIC_DOJO_CHAIN_ID);
    }
  }

  async function loadChainId() {
    await accountProvider.wait();

    if (!accountProvider.getProvider()?.getWalletAccount()) {
      return;
    }

    chainId = await accountProvider.getChainId();
  }

  onMount(() => {
    accountProvider.listen((event) => {
      if (event.type === 'chain_change') {
        console.log('New Chain ID:', event.chainId);
        chainId = event.chainId;
      } else if (event.type === 'connected') {
        loadChainId();
      } else if (event.type === 'disconnected') {
        if (providerName != null) {
          accountProvider.selectAndLogin(providerName);
          providerName = undefined;
        }
      }
    });

    loadChainId();
  });
</script>

{#if visible}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
  >
    <Card class="flex flex-col min-w-96 bg-ponzi items-center max-w-40 p-5">
      <h2 class="text-3xl font-bold pb-5">You are on the wrong chain!</h2>
      <p class="p-3">
        You are using {chainId}, while the playtest is happenning in {PUBLIC_DOJO_CHAIN_ID}.
        <br />
        To enjoy the PonziLand experience, you need to switch to the good network.
        You can do this by clicking the button below.
      </p>

      <Button onclick={switchNetwork} class="mt-5">Change chain</Button>
    </Card>
  </div>
{/if}
