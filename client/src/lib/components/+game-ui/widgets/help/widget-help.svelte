<script>
  import { goto } from '$app/navigation';
  import { Button } from '$lib/components/ui/button';
  import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
  import WidgetSettings from '../settings/widget-settings.svelte';
  import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
  import accountData from '$lib/account.svelte';

  let claimState = $state('idle');

  async function claimTokens() {
    if (claimState === 'loading') return;

    claimState = 'loading';
    try {
      if (!accountData.address) {
        throw new Error('No address found');
      }
      const response = await fetch(
        `${PUBLIC_SOCIALINK_URL}/api/user/${accountData.address}/mint`,
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

<div class="w-full h-full pb-4">
  <ScrollArea class="w-full h-full">
    <div class="flex flex-col gap-4 p-6">
      <img
        src="/tutorial/PONZIMASTER.png"
        alt="Ponzimaster"
        class="w-24 h-24 mx-auto"
      />
      <p class="text-center font-bold text-sm md:text-base">
        HAHAHAHAHA! Still confused?
        <br />
        Let me guide you through the depths of deception in my tutorial,
        <br />
        or brave the forbidden scrolls of knowledge in the documentation!
      </p>
      <div class="flex justify-center gap-4">
        <Button onclick={() => goto('/tutorial')}>Tutorial</Button>
        <a href="https://docs.ponzi.land" target="_blank"
          ><Button>Docs</Button></a
        >
      </div>
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

      <div class="flex justify-center gap-4 mt-2">
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <a
          href="https://discord.gg/ponziland"
          target="_blank"
          class="text-blue-400 hover:text-blue-300 transition-colors"
        >
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"
            />
          </svg>
        </a>
        <!-- svelte-ignore a11y_consider_explicit_label -->
        <a
          href="https://twitter.com/ponzidotland"
          target="_blank"
          class="text-blue-400 hover:text-blue-300 transition-colors"
        >
          <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
            />
          </svg>
        </a>
      </div>
    </div>

    <WidgetSettings />
  </ScrollArea>
</div>
