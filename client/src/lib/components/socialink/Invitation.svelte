<script lang="ts">
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import { Button } from '../ui/button';
  import { refresh, state } from '$lib/account.svelte';

  const socialink = getSocialink();

  const {
    onfinish,
  }: {
    onfinish: () => void;
  } = $props();

  function startInvitation() {
    socialink
      .startInvitation()
      .then(async (tx: string) => {
        // We can force the reload of the account data
        console.log('Invitation finished, tx:', tx);
        await refresh();

        if (onfinish) {
          onfinish();
        }
      })
      .catch(async () => {
        // The user might have closed after a successful invitation
        await refresh();

        if (state.profile?.exists && state.profile?.whitelisted) {
          // User is whitelisted, so do as if it was successful
          if (onfinish) {
            onfinish();
          }
        }
      });
  }
</script>

<div class="flex flex-col items-center flex-grow p-5">
  <div class="flex flex-col flex-grow max-w-96 gap-2">
    <h1 class="text-2xl font-bold mb-5 self-center">Whitelist</h1>
    <p>PonziLand is not yet available to everyone.</p>
    <p>
      You can click on the "Validate Account" button below to check if you meet
      the requirements to start playing, and jump in the action if you meet
      them.
    </p>
    <p>
      If you are not eligible, don't worry. Keep an eye on our Twitter account
      to get notified when the game releases!
    </p>

    <span class="self-end h-full grow">&nbsp;</span>

    <Button class="mt-4 self-stretch" on:click={startInvitation}
      >Validate Account</Button
    >
  </div>
</div>
