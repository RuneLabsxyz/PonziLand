<script lang="ts">
  import OnboardingWalletInfo from '$lib/components/+game-ui/widgets/wallet/onboarding-wallet-info.svelte';
  import { Button } from '$lib/components/ui/button';
  import { Card } from '$lib/components/ui/card';
  import Input from '$lib/components/ui/input/input.svelte';
  import { TokenSelect } from '$lib/components/ui/token';
  import { useAccount } from '$lib/contexts/account.svelte';
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';
  import { cairo, CallData, Account, Provider, RpcProvider } from 'starknet';
  let selectedToken: Token | undefined = $state();
  let amount = $state('1');
  import { loadDojoConfig } from '$lib/dojoConfig';

  let account = useAccount();
  function mint() {
    if (!selectedToken || !account?.getProvider()?.getWalletAccount()) return;

    let walletAccount = account?.getProvider()?.getWalletAccount();
    walletAccount?.execute([
      {
        contractAddress: selectedToken.address,
        entrypoint: 'mint',
        calldata: CallData.compile([
          cairo.felt(walletAccount.address),
          cairo.uint256(
            CurrencyAmount.fromScaled(amount, selectedToken).toBignumberish(),
          ),
        ]),
      },
    ]);
  }

  async function mint_strk() {
    if (!selectedToken || !account?.getProvider()?.getWalletAccount()) return;

    let config = await loadDojoConfig();

    let master_acccount = new Account( {
      provider: new RpcProvider({
        nodeUrl: "https://play.ponzis.fun/x/katana/katana",
      }),
      address: config.masterAddress,
      signer: config.masterPrivateKey,
    });

    let res = await master_acccount.execute([
      {
        contractAddress: "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
        entrypoint: 'transfer',
        calldata: CallData.compile([
          cairo.felt(account?.getProvider()?.getWalletAccount()?.address.toString()!),
          cairo.uint256(
            (1*10**21),
          ),
        ]),
      },
    ]);

    console.log(res);
  }
</script>

<OnboardingWalletInfo />

<div class="w-screen h-screen p-5 flex flex-col items-center justify-center">
  <Card class="h-96 ">
    <div
      class="flex flex-col items-center justify-center text-2xl text-ponzi font-extrabold mb-5 mt-5"
    >
      Mint tokens
    </div>

    <div class="p-5 text-2xl">
      As we are in a testing environment, we can mint tokens for free on this
      page, for testing purposes, and to experiment on the game without risking
      money.
    </div>

    <div class="flex justify-stretch gap-2">
      <Input type="text" bind:value={amount} />
      <TokenSelect
        bind:value={selectedToken}
        variant="swap"
        tutorialEnabled={true}
      />
    </div>

    <Button class="w-full mt-5" onclick={mint}>Mint</Button>
  
    <Button class="w-full mt-5" onclick={mint_strk}>Mint Strk </Button>
  </Card>

</div>
