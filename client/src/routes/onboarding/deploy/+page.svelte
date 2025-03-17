<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { Send } from 'lucide-svelte';
  import { constants } from 'starknet';

  async function sendDummyTransaction() {
    const { transaction_hash } = await useAccount()
      ?.getProvider()
      ?.getWalletAccount()
      ?.execute(
        {
          contractAddress:
            '0x02d2a4804f83c34227314dba41d5c2f8a546a500d34e30bb5078fd36b5af2d77',
          entrypoint: 'set_status',
          calldata: ['1'],
        },
        {
          version: constants.TRANSACTION_VERSION.V3,
        },
      )!;

    console.log('Sent dummy transaction!', transaction_hash);

    goto('/onboarding/register');
  }
</script>

<div class="flex flex-col h-full grow p-5 gap-2 max-w-[40rem]">
  <h1 class="text-2xl font-bold self-center mb-5">
    Whoa, you just got started!
  </h1>
  <p>Looks like you are just getting started with starknet!</p>
  <p>
    You need to make your first transaction before you can start playing on
    PonziLand.
  </p>
  <p>
    While clicking on the button below will allow you to do it, you might need
    to transfer some STRK tokens to your account.
  </p>
  <p>
    Once it is done, you can click the button below, send the transaction and
    get closer to playing on PonziLand!
  </p>

  <span class="self-end h-full grow">&nbsp;</span>
  <Button on:click={sendDummyTransaction}>Send transaction</Button>
</div>
