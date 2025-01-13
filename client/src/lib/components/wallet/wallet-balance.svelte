<script lang="ts">
  import { fetchBLUEBalance, fetchREDBalance, fetchGREENBalance } from '$lib/accounts/balances';
  import { useDojo } from '$lib/contexts/dojo';

  const { store, client: sdk, account } = useDojo();

  const accountData = $derived(account.getAccount());

  let redBalance = $state();
  let greenBalance = $state();
  let blueBalance = $state();

  const toReadableFormat = (balance: unknown) => {
    if (typeof balance !== 'bigint' && typeof balance !== 'number' ) {
      return balance;
    }

    return BigInt(balance) / BigInt(10) ** BigInt(18);
  };

  $effect(() => {
    fetchREDBalance(accountData?.address ?? '').then((res) => {
      console.log('from component RED:', res);
      console.log(typeof res);
      redBalance = res
    })
    fetchGREENBalance(accountData?.address ?? '').then((res) => {
      console.log('from component GREEN:', res);
      console.log(typeof res);
        greenBalance = res;
    });
    fetchBLUEBalance(accountData?.address ?? '').then((res) => {
      console.log('from component BLUE:', res);
      console.log(typeof res);
      blueBalance = res
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
