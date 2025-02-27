<script lang="ts">
  import CharacterBox from '$lib/components/ramp/character-box.svelte';
  import CoinAnimation from '$lib/components/ramp/coin-animation.svelte';
  import type { LayoutServerData } from './$types';
  import type { AccountInterface } from 'starknet';

  import { address as ethAddress, provider } from '$lib/ramp/stores.svelte';
  import { AccountManager, setupAccount } from '$lib/contexts/account.svelte';

  let { children, data }: { children: any; data: LayoutServerData } = $props();

  let network = $derived(
    data.networks?.find(
      (network) =>
        Number(network.chain_id) === Number((provider.current as any)?.chainId),
    ),
  );

  let controllerAccount: AccountInterface | undefined = $state();
  let account: AccountManager | undefined = $state();

  function truncateAddress(
    address: string | undefined,
    length: number = 6,
  ): string {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }

  let promisesToWait = Promise.all([
    setupAccount().then((accountObj) => {
      account = accountObj ?? undefined;
      if (accountObj?.getProvider() != undefined) {
        controllerAccount = accountObj?.getProvider()?.getAccount();
      }

      // Listen on updates
      account?.listen(() => {
        controllerAccount = account?.getProvider()?.getAccount();
      });
    }),
  ]);
</script>

{#await promisesToWait}
  <div
    class="flex justify-center items-center text-3xl text-white w-full h-full"
  >
    Loading...
  </div>
{:then _}
  <div
    class="flex flex-col min-h-screen"
    style="background-image: url('/assets/ui/bg.png'); background-size: cover; background-position: center;"
  >
    <div
      class="absolute bottom-0 left-0 m-4 p-4 bg-gray-800 text-white rounded z-10"
    >
      <p>Network: {network?.display_name}</p>
      <p>
        Available tokens: {network?.tokens
          ?.map((token) => token.symbol)
          .join(', ')}
      </p>
      <p>ETH Address : {truncateAddress(ethAddress.current)}</p>
      <p>Controller Address: {truncateAddress(controllerAccount?.address)}</p>
    </div>
    <CharacterBox {controllerAccount} account={ethAddress.current} />

    {@render children()}
  </div>
{/await}
