<script lang="ts">
  import SelectWalletModal from '$lib/components/wallet/SelectWalletModal.svelte';
  import { setupAccount } from '$lib/contexts/account.svelte';
  import { onMount } from 'svelte';

  import '../app.css';
  setupAccount();
</script>

<SelectWalletModal />
<slot />
