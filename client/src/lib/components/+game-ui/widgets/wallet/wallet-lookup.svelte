<script lang="ts">
  import accountDataProvider, { setup } from '$lib/account.svelte';
  import { getSocialink } from '$lib/accounts/social/index.svelte';
  import { useDojo } from '$lib/contexts/dojo';
  import { padAddress, shortenHex } from '$lib/utils';
  import Button from '$lib/components/ui/button/button.svelte';
  import Card from '$lib/components/ui/card/card.svelte';
  import Leaderboard from '../widgets/leaderboard/Leaderboard.svelte';
  import ProMode from '$lib/components/ui/pro-mode.svelte';
  import WalletBalance from './wallet-balance.svelte';
  import WalletHelp from './wallet-help.svelte';

  setup();

  let socialink = getSocialink();

  let copied = $state(false);

  function copy() {
    try {
      navigator.clipboard.writeText(padAddress(address ?? '')!);

      copied = true;
      setTimeout(() => {
        copied = false;
      }, 1000);
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  const { client: sdk, accountManager } = useDojo();
  let address = $derived(accountDataProvider.address);

  let connected = $derived(accountDataProvider.isConnected);
  let username = $derived(socialink.getUser(address ?? ''));
</script>

<div class="absolute top-2 left-0" style="transform: translateX(-105%);">
  <div class="flex flex-col gap-2 items-end">
    <ProMode />
    <WalletHelp />
    <a
      href="https://x.com/ponzidotland"
      target="_blank"
      referrerpolicy="no-referrer"
    >
      <img
        src="/ui/social/x.png"
        alt="X icon"
        style="image-rendering: pixelated;"
        class="h-8 w-8"
      />
    </a>
    <a
      href="https://discord.gg/WJgymPB5aB"
      target="_blank"
      referrerpolicy="no-referrer"
    >
      <img
        src="/ui/social/discord.png"
        alt="Discord icon"
        style="image-rendering: pixelated;"
        class="h-8 w-8"
      />
    </a>
  </div>
</div>
{#if connected}
  <Card class="shadow-ponzi w-72">
    <div class="flex justify-between items-center">
      <button type="button" class="flex gap-2 items-center" onclick={copy}>
        {#if username}
          <p>
            User: {username}
            <span class="opacity-50"
              >{shortenHex(padAddress(address ?? ''), 8)}</span
            >
          </p>
        {:else}
          <p>User: {shortenHex(padAddress(address ?? ''), 8)}</p>
        {/if}
        <div class="h-2 w-2 rounded-full bg-green-700"></div>
        {#if copied}
          <div class="transition-opacity">Copied!</div>
        {/if}
      </button>
      <button
        onclick={() => {
          accountManager?.disconnect();
        }}
        aria-label="Logout"
      >
        <img src="/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
      </button>
    </div>
    <hr class="my-3" />
    <WalletBalance />
  </Card>
  <Leaderboard />
{:else}
  <Button
    class="m-2"
    onclick={async () => {
      await accountManager?.promptForLogin();
    }}>CONNECT WALLET</Button
  >
{/if}
<div class="fixed top-0 right-0 z-50">
  <div class="absolute top-2 left-0" style="transform: translateX(-105%);">
    <div class="flex flex-col gap-2 items-end">
      <ProMode />
      <WalletHelp />
      <a
        href="https://x.com/ponzidotland"
        target="_blank"
        referrerpolicy="no-referrer"
      >
        <img
          src="/ui/social/x.png"
          alt="X icon"
          style="image-rendering: pixelated;"
          class="h-8 w-8"
        />
      </a>
      <a
        href="https://discord.gg/WJgymPB5aB"
        target="_blank"
        referrerpolicy="no-referrer"
      >
        <img
          src="/ui/social/discord.png"
          alt="Discord icon"
          style="image-rendering: pixelated;"
          class="h-8 w-8"
        />
      </a>
    </div>
  </div>
  {#if connected}
    <Card class="shadow-ponzi w-72">
      <div class="flex justify-between items-center">
        <button type="button" class="flex gap-2 items-center" onclick={copy}>
          {#if username}
            <p>
              User: {username}
              <span class="opacity-50"
                >{shortenHex(padAddress(address ?? ''), 8)}</span
              >
            </p>
          {:else}
            <p>User: {shortenHex(padAddress(address ?? ''), 8)}</p>
          {/if}
          {#if copied}
            <div class="transition-opacity">Copied!</div>
          {/if}
        </button>
        <button
          onclick={() => {
            accountManager?.disconnect();
          }}
          aria-label="Logout"
        >
          <img src="/ui/icons/logout.png" alt="logout" class="h-5 w-5" />
        </button>
      </div>
      <hr class="my-3" />
      <WalletBalance />
    </Card>
    <Leaderboard />
  {:else}
    <Button
      class="m-2"
      onclick={async () => {
        await accountManager?.promptForLogin();
      }}>CONNECT WALLET</Button
    >
  {/if}
</div>
