<script>
  import { fetchBLUEBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import WalletBalance from './wallet-balance.svelte';
  import WalletHelp from './wallet-help.svelte';

  const { store, client: sdk, account } = useDojo();

  let connected = $state(false);

  $effect(() => {
    if (account.getAccount()) {
      connected = true;
    } else {
      connected = false;
    }
  });
</script>

<div class="fixed top-0 right-0 z-50">
  <div class="absolute top-2 left-0" style="transform: translateX(-120%);">
    <WalletHelp />
  </div>
  {#if connected}
    <Card class="shadow-ponzi">
      <p>Wallet: {padAddress(account.getAccount()?.address ?? '')}</p>
      <Button
        on:click={() => {
          account.disconnect();
          connected = false;
        }}>LOGOUT</Button
      >
      <WalletBalance />
    </Card>
  {:else}
    <Button
      class="m-2"
      onclick={async () => {
        await account.connect().then(() => {
          if (account.getAccount()?.address) connected = true;
        });
      }}>CONNECT WALLET</Button
    >
  {/if}
</div>
