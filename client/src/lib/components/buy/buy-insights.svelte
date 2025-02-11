<script lang="ts">
  import { estimateTax } from '$lib/utils/taxes';

  let { sellAmountVal, stakeAmountVal } = $props();

  let taxes = $derived(estimateTax(sellAmountVal));
</script>

<div>{sellAmountVal} {stakeAmountVal} : max {taxes.maxRate}/h</div>
