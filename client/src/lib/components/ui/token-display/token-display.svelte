<script lang="ts">
  let {
    amount,
    tokenAddress = undefined,
    symbol,
  } = $props<{
    amount: bigint;
    tokenAddress?: string;
    symbol: string;
  }>();

  const toReadableFormat = (
    amount: bigint,
    precision: number = 4,
    tokenDecimals: number = 18,
  ) => {
    if (typeof amount !== 'bigint' && typeof amount !== 'number') {
      return amount;
    }

    const factor = BigInt(10) ** BigInt(tokenDecimals - precision);
    const adjustedAmount = BigInt(amount) / factor;
    const formattedAmount = Number(adjustedAmount) / 10 ** precision;

    return formattedAmount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
    });
  };

  let readableAmount = $derived(toReadableFormat(amount));
</script>

<div class="flex flex-col items-end">
  <div class="flex gap-2 items-center">
    <div class="amount">{readableAmount}</div>
    <div class="font-bold w-8 text-right">{symbol}</div>
  </div>
  <div class="dollars">$2500</div>
</div>

<style>
  .amount {
    text-shadow: none;
  }

  .dollars {
    font-size: 0.75rem;
    color: #a0aec0;
    text-shadow: none;
  }
</style>
