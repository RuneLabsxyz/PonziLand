<script lang="ts">
  import type { AccountInterface } from 'starknet';
  import Button from '$lib/components/ui/button/button.svelte';
  import Input from '$lib/components/ui/input/input.svelte';
  import {
    AccountManager,
    setupAccount,
    useAccount,
  } from '$lib/contexts/account.svelte';
  import { appKit } from '$lib/ramp';
  import {
    provider,
    address as ethAddress,
    currentStep,
    setCurrentStep,
  } from '$lib/ramp/stores.svelte';
  import { BrowserProvider } from 'ethers/providers';
  import type { PageData } from './$types';
  import RampTokenSelect from './RampTokenSelect.svelte';
  import type { NetworkWithTokens } from '@layerswap/sdk/resources/index';
  import { Card } from '$lib/components/ui/card';
  import { enhance } from '$app/forms';
  import { Contract } from 'ethers';
  import BigNumber from 'bignumber.js';
  import { debounce } from '$lib/utils/debounce.svelte';
  import type { QuoteResponse } from './api/fetch-quote/+server';
  import { onMount } from 'svelte';
  import WalletSetups from './WalletSetups.svelte';

  const {
    data,
  }: {
    data: PageData;
  } = $props();

  let account = useAccount();
  let controllerAccount: AccountInterface | undefined = $state();

  onMount(() => {
    if (account?.getProvider() != undefined) {
      controllerAccount = account?.getProvider()?.getAccount();
    }

    // Listen on updates
    account?.listen(() => {
      controllerAccount = account?.getProvider()?.getAccount();
    });
  });

  let network = $derived(
    data.networks?.find(
      (network: NetworkWithTokens.Data) =>
        Number(network.chain_id) === Number((provider.current as any)?.chainId),
    ),
  );

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
      error = undefined;

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

  async function startSwap() {}
</script>

<Card
  class="flex flex-col items-center justify-center w-fit h-fit mx-auto text-3xl z-20 md:min-w-[25rem] "
>
  <div class="p-5 text-white w-full">
    <WalletSetups />

    <div class="pt-5 pb-3">3. Prepare your transfer</div>

    <form method="POST" use:enhance class="flex flex-col gap-2">
      <input
        type="hidden"
        name="destination_address"
        value={controllerAccount?.address}
      />

      <input type="hidden" name="source_network" value={network?.name} />

      <input type="hidden" name="source_token" value={selectedToken?.symbol} />

      <div class="flex gap-2 text-stroke-0 text-stroke-none">
        <Input
          type="text"
          bind:value={amount}
          name="amount"
          placeholder="1"
          class="ponzi-number"
        />
        <RampTokenSelect
          class="w-60"
          values={network?.tokens ?? []}
          bind:value={selectedToken}
        />
      </div>

      <div class="flex justify-end w-full h-5 text-xl">
        {#if balance}
          <p>You have {balance?.toString()} {selectedToken?.symbol}</p>
        {/if}
      </div>
      {#if error}
        <div class="flex justify-center">
          <Card class="bg-red-800 text-wrap text-lg w-fit max-w-[27rem]">
            <p class="p-2">{error.message}</p>
          </Card>
        </div>
      {/if}

      {#if quote}
        <div>
          <p>Quote:</p>
          <table
            class="w-full table-auto border-1 border-collapse border border-white mt-2 text-lg"
          >
            <tbody>
              <tr class="border-b border-white bg-gray-800">
                <th class="border-r text-right py-1 pr-2">You transfer</th>
                <td class="pl-2">
                  {debouncedAmount.current}
                  {selectedToken?.symbol}
                </td>
              </tr>
              <tr class="border-b border-white">
                <th class="border-r text-right py-1 pr-2">Layerswap Fees</th>
                <td class="pl-2 text-red-600">
                  - {quote.layerswap_fees}
                  {selectedToken?.symbol}
                </td>
              </tr>
              <tr class="border-b border-white">
                <th class="border-r text-right py-1 pr-2">Blockchain Fees</th>
                <td class="pl-2 text-red-600">
                  - {quote.blockchain_fees}
                  {selectedToken?.symbol}
                </td>
              </tr>
              <tr class="border-b border-white">
                <th class="border-r text-right py-1 pr-2">PonziLand Fees</th>
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
  </div>
</Card>
