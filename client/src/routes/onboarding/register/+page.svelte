<script lang="ts">
  import Register from '$lib/components/socialink/register.svelte';
  import { useAccount } from '$lib/contexts/account.svelte';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { Account } from 'starknet';
  import { Button } from '$lib/components/ui/button';

  const accountManager = useAccount();
</script>

<Register />
