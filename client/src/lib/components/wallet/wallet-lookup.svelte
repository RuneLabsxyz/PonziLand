<script>
  import { useDojo } from '$lib/contexts/dojo';
  import { accountAddress } from '$lib/stores/stores';
  import { stringify } from 'postcss';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import { useController } from '$lib/accounts/controller';
  import { fetchBLUEBalance } from '$lib/accounts/balances';

  const { store, client: sdk, account } = useDojo();
  const controller = useController();

  const accountData = $derived(account.getAccount());

  const handleShowInventory = () => {
    controller.openProfile('inventory');
  };

  let balance = $state(0);

  $effect(() => {
    fetchBLUEBalance(accountData?.address ?? '').then((res) =>
      console.log('from component BLUE:', res),
    );
  });
</script>

<div class="fixed top-0 right-0 z-50">
  {#if account}
    <Card>
      <p>Wallet: {accountData?.address}</p>
      <pre>{accountData}</pre>
      <Button onclick={() => handleShowInventory()}>inventory</Button>
    </Card>

    <Card>
      <pre>{accountData}</pre>
    </Card>
  {:else}
    <Button class="m-2">Connect Wallet</Button>
  {/if}
</div>
