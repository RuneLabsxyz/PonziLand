<script lang="ts">
  import { goto } from '$app/navigation';
  import { PUBLIC_DOJO_PROFILE } from '$env/static/public';
  import { Button } from '$lib/components/ui/button';
  import { Input } from '$lib/components/ui/input';
  import { useAccount } from '$lib/contexts/account.svelte';
  import { ClipboardCopy, ClipboardPaste, Send } from 'lucide-svelte';
  import { constants } from 'starknet';
  import { state as accountState } from '$lib/account.svelte';
  import { onMount } from 'svelte';
  import manifest from '$manifest';

  let copied = $state(false);

  let account = useAccount();

  async function sendDummyTransaction() {
    const { transaction_hash } = await useAccount()
      ?.getProvider()
      ?.getWalletAccount()
      ?.execute(
        {
          contractAddress: manifest.contracts.find(
            (e) => e.tag === 'ponzi_land-auth',
          )?.address!,
          entrypoint: 'ensure_deploy',
          calldata: [],
        },
        {
          version: constants.TRANSACTION_VERSION.V3,
        },
      )!;

    console.log('Sent dummy transaction!', transaction_hash);

    window.location.href = '/onboarding/register';
  }

  onMount(() => {
    console.log('Profile:', PUBLIC_DOJO_PROFILE);
    console.log('Account:', account?.getProviderName());
  });
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

  {#if account?.getProviderName() != 'controller'}
    <p>
      While clicking on the button below will allow you to do it, you might need
      to transfer some STRK tokens to your account.
    </p>
  {:else}
    <p>
      As we are paying for fees during the tournament, you only have to click
      the button below to deploy your account!
    </p>
  {/if}

  {#if PUBLIC_DOJO_PROFILE == 'sepolia'}
    <div>
      You can get some tokens from the <a
        class="text-blue-500 hover:underline"
        target="_blank"
        href="https://starknet-faucet.vercel.app/">official faucet</a
      >. This is your wallet address:
      <div class="bg-white flex p-0 my-4">
        <Input
          readonly
          value={accountState.address}
          class="!text-black my-2 text-stroke-0 text-stroke-none flex-grow m-0"
        />
        {#if copied}
          <span class="text-green-500 self-center px-2">Copied!</span>
        {/if}
        <button
          class="text-black px-2"
          onclick={() => {
            copied = true;
            setTimeout(() => {
              copied = false;
            }, 2000);
            navigator.clipboard.writeText(accountState.address ?? '');
          }}
        >
          <ClipboardCopy />
        </button>
      </div>
    </div>
  {/if}

  <p>
    Once it is done, you can click the button below, send the transaction and
    get closer to playing on PonziLand!
  </p>

  <span class="self-end h-full grow">&nbsp;</span>
  <Button on:click={sendDummyTransaction}>Send transaction</Button>
</div>
