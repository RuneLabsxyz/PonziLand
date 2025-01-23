<script lang="ts">
  import type { Token } from '$lib/interfaces';
  import { CurrencyAmount } from '$lib/utils/CurrencyAmount';

  let { amount, token } = $props<{
    amount: bigint;
    token: Token;
  }>();
</script>

<div class="flex flex-col items-end">
  <div class="flex gap-2 items-center">
    <div class="amount">
      {CurrencyAmount.fromUnscaled(amount, token.decimals)}
    </div>
    <div class="font-bold text-right">{token.name}</div>
  </div>
  <div class="dollars">$0000</div>
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
