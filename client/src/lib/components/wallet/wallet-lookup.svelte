<script lang="ts">
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress, shortenHex } from '$lib/utils';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import WalletBalance from './wallet-balance.svelte';
  import WalletHelp from './wallet-help.svelte';
  import accountDataProvider, { setup } from '$lib/account.svelte';

  setup();

  let copied = $state(false);

  function copy() {
    try {
      navigator.clipboard.writeText(padAddress(address ?? '')!);

      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  const { store, client: sdk, accountManager } = useDojo();
  const address = $derived(accountDataProvider.address);
  const connected = $derived(accountDataProvider.isConnected);
</script>

<div class="fixed top-0 right-0 z-50">
  <div class="absolute top-2 left-0" style="transform: translateX(-120%);">
    <WalletHelp />
  </div>
  {#if connected}
    <Card class="shadow-ponzi w-72">
      <div class="flex justify-between items-center">
        <button type="button" class="flex gap-2 items-center" onclick={copy}>
          <p>User: {shortenHex(padAddress(address ?? ''), 8)}</p>
          <div class="h-2 w-2 rounded-full bg-green-700"></div>
          {#if copied}
            <div class="transition-opacity">Copied!</div>
          {/if}
        </button>
        <button
          onclick={() => {
            accountManager.disconnect();
          }}
          aria-label="Logout"
        >
          <img src="/assets/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
        </button>
      </div>
      <hr class="my-3" />
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
