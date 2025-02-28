<script lang="ts">
  import { listen } from '$lib/accounts/social/messageHandler';
  import { onMount } from 'svelte';
  import { useAccount } from '$lib/contexts/account.svelte';

  let iframe: HTMLIFrameElement | undefined = $state();
  let account = useAccount();

  onMount(() => {
    // Handles unsubsribe correctly.
    return listen(iframe!, () =>
      useAccount()?.getProvider()?.getWalletAccount(),
    );
  });
</script>

<div class="absolute top-0 left-0 z-40">
  <iframe
    bind:this={iframe}
    title="Discord link"
    src="http://localhost:5173/discord/link"
    width="100%"
    height="500px"
    frameborder="0"
  ></iframe>
</div>
