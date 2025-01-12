<script>
  import Button from "$lib/components/ui/button/button.svelte";
  import { useAccount } from "$lib/contexts/account";
  import { goto } from "$app/navigation";

  const { value, ...rest } = $props();

  const account = useAccount();
</script>

<Button {...rest}>Cartridge Controller</Button>
