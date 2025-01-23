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
