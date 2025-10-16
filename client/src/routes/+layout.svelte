<script lang="ts">
  import SelectWalletModal from '$lib/components/+game-ui/modals/SelectWalletModal.svelte';
  import MobileBlock from '$lib/components/MobileBlock.svelte';

  import { setupAccount } from '$lib/contexts/account.svelte';
  import { setupFaro } from '$lib/contexts/faro';

  import '../app.css';
  setupFaro();
  setupAccount();

  let isMobile = $state(false);

  $effect(() => {
    const checkMobile = () => {
      if (!isMobile && window.innerWidth < 768) {
        isMobile = true;
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  });
</script>

<svelte:head>
  <title>Ponziland - The Ultimate DeFi Game</title>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta
    name="description"
    content="Ponziland is a fully token-agnostic DeFi game where you conquer lands, stake tokens, nuke rivals, and build empires."
  />
  <meta property="og:title" content="Ponziland - The Ultimate DeFi Game" />
  <meta
    property="og:description"
    content="Conquer, stake, and nuke your way through a wild DeFi metagame."
  />
  <meta property="og:image" content="https://play.ponzi.land/logo.png" />
  <meta property="og:url" content="https://ponzi.land" />

  //Twitter
  <meta name="twitter:card" content="https://play.ponzi.land/home/hero.png" />
  <meta name="twitter:title" content="Ponziland - The Ultimate DeFi Game" />
  <meta
    name="twitter:description"
    content="Conquer, stake, and nuke your way through a wild DeFi metagame."
  />
  <meta name="twitter:image" content="https://play.ponzi.land/home/hero.png" />
</svelte:head>

{#if isMobile}
  <MobileBlock />
{:else}
  <SelectWalletModal />
  <slot />
{/if}
