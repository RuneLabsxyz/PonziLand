<script lang="ts">
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import WalletBalance from './wallet-balance.svelte';
  import WalletHelp from './wallet-help.svelte';
  import accountDataProvider, { setup } from '$lib/account.svelte';

  setup();

  const { store, client: sdk, accountManager } = useDojo();
  const address = $derived(accountDataProvider.address);
  const connected = $derived(accountDataProvider.isConnected);
</script>

<div class="fixed top-0 right-0 z-50">
  <div class="absolute top-2 left-0" style="transform: translateX(-120%);">
    <WalletHelp />
  </div>
  {#if connected}
    <Card class="shadow-ponzi">
      <p>Wallet: {padAddress(address ?? '')}</p>
      <Button
        on:click={() => {
          accountManager.disconnect();
        }}>LOGOUT</Button
      >
      <WalletBalance />
    </Card>
  {:else}
    <Button
      class="m-2"
      onclick={async () => {
        await accountManager.promptForLogin();
      }}>CONNECT WALLET</Button
    >
  {/if}
</div>
