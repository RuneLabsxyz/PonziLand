<script>
  import { fetchBLUEBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import WalletBalance from './wallet-balance.svelte';
  import WalletHelp from './wallet-help.svelte';

  const { store, client: sdk, account } = useDojo();

  let accountData = $derived(account.getAccount());
</script>

<div class="fixed top-0 right-0 z-50 flex items-center gap-2">
  <div>
    <WalletHelp />
  </div>
  {#if accountData}
    <Card class="shadow-ponzi">
      <p>Wallet: {padAddress(accountData?.address)}</p>
      <Button
        on:click={() => {
          account.disconnect();
        }}>LOGOUT</Button
      >
      <WalletBalance />
    </Card>
  {:else}
    <Button
      class="m-2"
      onclick={async () => {
        await account.connect().then(() => {
          
        });
      }}>CONNECT WALLET</Button
    >
  {/if}
</div>
