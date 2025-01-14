<script lang="ts">
  import { fetchTokenBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';
  import { dojoConfig } from '$lib/dojoConfig';
  import { DojoProvider } from '@dojoengine/core';

  const { store, client: sdk, account } = useDojo();

  const accountData = $derived(account.getAccount());

  let redBalance = $state();
  let greenBalance = $state();
  let blueBalance = $state();

  const toReadableFormat = (balance: unknown) => {
    if (typeof balance !== 'bigint' && typeof balance !== 'number') {
      return balance;
    }

    return BigInt(balance) / BigInt(10) ** BigInt(18);
  };

  $effect(() => {
    if (!accountData) {
      return;
    }

    const provider = new DojoProvider(dojoConfig.manifest, dojoConfig.rpcUrl);
    fetchTokenBalance(
      '0x06450580d0d5cd36f0107227091ca68a237fd0ab538ae59ea43868f660bc2c30',
      accountData,
      provider,
    ).then((res) => {
      console.log('from component:', res);
      redBalance = res;
    });
    fetchTokenBalance(
      '0x04ed678da6c0534e8ba7a1e7db81f3ecc0f1c2628094094b5123c481cd13461f',
      accountData,
      provider,
    ).then((res) => {
      console.log('from component:', res);
      greenBalance = res;
    });
    fetchTokenBalance(
      '0x01853f03f808ae62dfbd8b8a4de08e2052388c40b9f91d626090de04bbc1f619',
      accountData,
      provider,
    ).then((res) => {
      console.log('from component:', res);
      blueBalance = res;
    });
  });
</script>

<div>Wallet Balance</div>
<div>
  RED: {toReadableFormat(redBalance)}
  <span class="text-gray-500">({redBalance})</span>
</div>
<div>
  GREEN: {toReadableFormat(greenBalance)}
  <span class="text-gray-500">({greenBalance})</span>
</div>
<div>
  BLUE: {toReadableFormat(blueBalance)}
  <span class="text-gray-500">({blueBalance})</span>
</div>
