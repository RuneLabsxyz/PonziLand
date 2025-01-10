<script>
  import { useDojo } from '$lib/contexts/dojo';
  import { accountAddress } from '$lib/stores/stores';
  import { stringify } from 'postcss';
  import Button from '../ui/button/button.svelte';
  import Card from '../ui/card/card.svelte';
  import { useController } from '$lib/accounts/controller';

  const { store, client: sdk, account } = useDojo();
  const controller = useController();
  
  const accountData = $derived(account.getAccount())

  const handleShowInventory = () => {
    controller.openProfile("inventory");
  };

</script>

<div class="fixed top-0 right-0 z-50">
  {#if account}
    <Card>
      <p>Wallet: {accountData?.address}</p>
      <pre>{accountData}</pre>
    </Card>
  {:else}
    <Button class="m-2">Connect Wallet</Button>
  {/if}
  <Button onclick={() => handleShowInventory()}>
    inventory
  </Button>
</div>
