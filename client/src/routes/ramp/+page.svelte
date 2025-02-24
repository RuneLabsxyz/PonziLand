<script lang="ts">
  import type { AccountInterface } from 'starknet';
  import Button from '$lib/components/ui/button/button.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import { AccountManager, setupAccount } from '$lib/contexts/account';
  import { appKit } from '$lib/ramp';
  import { provider, address as ethAddress } from '$lib/ramp/stores.svelte';
  import { BrowserProvider } from 'ethers/providers';
  import type { PageData } from './$types';
  import RampTokenSelect from './RampTokenSelect.svelte';
  import type { NetworkWithTokens } from '@layerswap/sdk/resources/index.mjs';
  import { Card } from '$lib/components/ui/card';
  import { enhance } from '$app/forms';
  import { Contract } from 'ethers';
  import BigNumber from 'bignumber.js';
  import { debounce } from '$lib/utils/debounce.svelte';
  import type { QuoteResponse } from './api/fetch-quote/+server';
  import CoinAnimation from '$lib/components/ramp/coin-animation.svelte';
  import Particles from '$lib/components/ramp/particles.svelte';
  import CharacterBox from '$lib/components/ramp/character-box.svelte';

  let { data }: { data: PageData } = $props();

  $inspect(data.networks?.map((e) => [e.chain_id, e.display_name]));

  let network = $derived(
    data.networks?.find(
      (network) =>
        Number(network.chain_id) === Number((provider.current as any)?.chainId),
    ),
  );

  let controllerAccount: AccountInterface | undefined = $state();
  let account: AccountManager | undefined = $state();

  let selectedToken: NetworkWithTokens.Data.Token | undefined = $state();

  let balance: BigNumber | undefined = $state();
  $effect(() => {
    balance = undefined;
    if (selectedToken) {
      const ethersProvider = new BrowserProvider(provider.current!);

      if (selectedToken.contract == null) {
        (async () => {
          balance = new BigNumber(
            (await ethersProvider.getBalance(ethAddress.current!)).toString(),
          ).shiftedBy(-(selectedToken?.decimals ?? 18));
        })();
      } else {
        const ERC20_ABI = [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
          'function balanceOf(address) view returns (uint)',
        ];

        const getBalance = async () => {
          const contract = new Contract(
            selectedToken?.contract!,
            ERC20_ABI,
            ethersProvider,
          );
          balance = new BigNumber(
            await contract.balanceOf(ethAddress.current!),
          ).shiftedBy(-(selectedToken?.decimals ?? 18));
        };
        getBalance();
      }
    }
  });

  let amount: number | undefined = $state();

  let promisesToWait = Promise.all([
    setupAccount().then((accountObj) => {
      if (accountObj == undefined) {
        return;
      }
      account = accountObj;
      if (accountObj.getProvider() != undefined) {
        controllerAccount = accountObj.getProvider()?.getAccount();
      }

      // Listen on updates
      account?.listen((event) => {
        controllerAccount = account?.getProvider()?.getAccount();
      });
    }),
  ]);

  const debouncedAmount = debounce(() => amount, { delay: 500 });

  let quote: QuoteResponse | undefined = $state();
  let error: any | undefined = $state();

  $effect(() => {
    if (
      debouncedAmount.current &&
      debouncedAmount.current > 0 &&
      selectedToken
    ) {
      quote = undefined;
      // Fetch quote
      fetch(
        `/ramp/api/fetch-quote?amount=${debouncedAmount.current}&sourceNetwork=${network?.name}&sourceToken=${selectedToken?.symbol}`,
      ).then(async (response) => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        const data = await response.json();
        if (data.error) {
          error = data.error;
        } else {
          quote = data;
        }
      });
    }
  });

  let isPhantomConnected = $state(false);
  let isControllerConnected = $state(false);

  function connectPhantom() {
    appKit.open();
    isPhantomConnected = !isPhantomConnected;
  }

  function connectController() {
    account?.selectAndLogin('controller');
    isControllerConnected = true;
  }

  function disconnectController() {
    account?.disconnect();
    isControllerConnected = false;
  }

  async function startSwap() {}

  function truncateAddress(
    address: string | undefined,
    length: number = 6,
  ): string {
    if (!address) return '';
    return `${address.slice(0, length)}...${address.slice(-length)}`;
  }
</script>

<Particles />

{#await promisesToWait}
  <div
    class="flex justify-center items-center text-3xl text-white w-full h-full"
  >
    Loading...
  </div>
{:then _}
  <div
    class="flex items-center justify-center min-h-screen"
    style="background-image: url('/assets/ui/bg.png'); background-size: cover; background-position: center;"
  >
    <div
      class="absolute top-0 left-0 m-4 p-4 bg-gray-800 text-white rounded z-10"
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
    <CoinAnimation />

    <CharacterBox {controllerAccount} account={ethAddress.current} />

    <Card
      class="flex flex-col items-center justify-center w-fit h-fit mx-auto text-3xl z-20"
    >
      <div class="p-5 text-white">
        <div class="">
          <div class="pb-3">
            1. Connect Phantom
            {#if ethAddress.current}
              <span>✔️</span>
            {/if}
          </div>
          <Button onclick={connectPhantom}>
            {#if !ethAddress.current}
              Connect
            {:else}
              Disconnect
            {/if}
          </Button>
        </div>
        <div class="pt-5 pb-3">
          2. Create your Controller
          {#if isControllerConnected || controllerAccount}
            <span>✔️</span>
          {/if}
        </div>
        {#if !controllerAccount?.address}
          <Button onclick={connectController}>Connect with controller</Button>
        {:else}
          <Button onclick={disconnectController}
            >Disconnect from controller</Button
          >
        {/if}
        <div class="pt-5 pb-3">
          3. Send tokens to your controller
          {#if isPhantomConnected && isControllerConnected}
            <span>✔️</span>
          {/if}
        </div>

        <Card class=" md:w-full px-2 mx-auto">
          <form method="POST" use:enhance class="flex flex-col gap-2">
            <input
              type="hidden"
              name="destination_address"
              value={controllerAccount?.address}
            />

            <input type="hidden" name="source_network" value={network?.name} />

            <input
              type="hidden"
              name="source_token"
              value={selectedToken?.symbol}
            />

            <p>I want to gamble:</p>

            <div class="flex gap-2">
              <Input type="text" bind:value={amount} name="amount" />
              <RampTokenSelect
                class="w-40"
                values={network?.tokens ?? []}
                bind:value={selectedToken}
              />
            </div>

            <div class="flex justify-end w-full h-5">
              {#if balance}
                <p>You have {balance?.toString()} {selectedToken?.symbol}</p>
              {/if}
            </div>
            {#if error}
              <Card class="bg-red-800">
                <p class="p-2">{error.message} :/</p>
              </Card>
            {/if}

            {#if quote}
              <div>
                <p>Quote:</p>
                <table
                  class="w-full table-auto border-1 border-collapse border border-white mt-2"
                >
                  <tbody>
                    <tr class="border-b border-white bg-gray-800">
                      <th class="border-r text-right py-1 pr-2">You transfer</th
                      >
                      <td class="pl-2">
                        {debouncedAmount.current}
                        {selectedToken?.symbol}
                      </td>
                    </tr>
                    <tr class="border-b border-white">
                      <th class="border-r text-right py-1 pr-2"
                        >Layerswap Fees</th
                      >
                      <td class="pl-2 text-red-600">
                        - {quote.layerswap_fees}
                        {selectedToken?.symbol}
                      </td>
                    </tr>
                    <tr class="border-b border-white">
                      <th class="border-r text-right py-1 pr-2"
                        >Blockchain Fees</th
                      >
                      <td class="pl-2 text-red-600">
                        - {quote.blockchain_fees}
                        {selectedToken?.symbol}
                      </td>
                    </tr>
                    <tr class="border-b border-white">
                      <th class="border-r text-right py-1 pr-2"
                        >PonziLand Fees</th
                      >
                      <td class="pl-2 text-red-600">
                        - {quote.ramp_fees}
                        {selectedToken?.symbol}
                      </td>
                    </tr>
                    <tr class="border-b border-white bg-green-800">
                      <th class="border-r text-right py-1 pr-2">You receive</th>
                      <td class="pl-2">
                        {quote.receive_amount}
                        USDC
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div class="flex flex-row justify-end mt-2">
                  <Button onclick={startSwap} type="submit"
                    >Shut up and take my money!</Button
                  >
                </div>
              </div>
            {/if}
          </form>
        </Card>
      </div>
    </Card>
  </div>
{/await}
