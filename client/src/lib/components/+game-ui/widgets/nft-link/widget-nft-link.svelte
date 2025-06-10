<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { useDojo } from '$lib/contexts/dojo';
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { PUBLIC_SOCIALINK_URL } from '$env/static/public';

  let url = $derived(
    `${PUBLIC_SOCIALINK_URL}/nfts?address=${accountDataProvider.address}`,
  );

  let claimState = $state('idle');

  async function claimTokens() {
    if (claimState === 'loading') return;

    claimState = 'loading';
    try {
      if (!accountDataProvider.address) {
        throw new Error('No address found');
      }
      const response = await fetch(
        `${PUBLIC_SOCIALINK_URL}/api/user/${accountDataProvider.address}/mint`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        throw new Error('Failed to claim tokens');
      }

      claimState = 'success';
      setTimeout(() => {
        claimState = 'idle';
      }, 2000);
    } catch (error) {
      claimState = 'error';
      setTimeout(() => {
        claimState = 'idle';
      }, 2000);
    }
  }
</script>

<div class="flex gap-1 w-full justify-around py-4">
  <img src="/extra/agents/duck.png" alt="Duck Png" class="w-16 h-16" />
  <img src="/extra/agents/wolf.png" alt="Wolf Png" class="w-16 h-16" />
  <img src="/extra/agents/everai.png" alt="Everai Png" class="w-16 h-16" />
  <img src="/extra/agents/blobert.png" alt="Blobert Png" class="w-16 h-16" />
</div>

<div class="text-xl">
  If you own an NFT from one of the collections in this tournament, you can link
  it to your game account to get some extra tokens to play with.
</div>

{#if accountDataProvider.address}
  <a href={url} target="_blank">
    <Button class="w-full my-4">Link your NFTs</Button>
  </a>
{/if}

<div class="text-md text-justify">
  The link is personal, and transfers the resulting tokens directly to your
  account. You do need to transfer the NFTs to your controller or the wallet you
  are currently playing with.
</div>

{#if accountDataProvider.address}
  <div class="w-full h-[1px] bg-gray-500 my-4">&nbsp;</div>

  In case you never got your starting tokens, you can try clicking on the button
  below to claim them:

  <div class="flex justify-center">
    <Button
      onclick={claimTokens}
      disabled={claimState !== 'idle'}
      class="relative"
    >
      {#if claimState === 'loading'}
        Loading...
      {:else if claimState === 'success'}
        ✓ Claimed!
      {:else if claimState === 'error'}
        ✗ Failed
      {:else}
        No tokens? Claim here!
      {/if}
    </Button>
  </div>
{/if}
