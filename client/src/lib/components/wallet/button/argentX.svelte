<script lang="ts">
  import Button from "$lib/components/ui/button/button.svelte";
  import { WALLET_API } from "@starknet-io/types-js";

  const {
    value,
    ...rest
  }: {
    value: WALLET_API.StarknetWindowObject;
  } & any = $props();
</script>

<Button {...rest}>Argent X</Button>
