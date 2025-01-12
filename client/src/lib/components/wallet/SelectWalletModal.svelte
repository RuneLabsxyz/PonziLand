<script lang="ts">
  import { on } from "svelte/events";
  import { onMount } from "svelte";
  import { dojoConfig } from "$lib/dojoConfig";
  import { setupAccount, USE_BURNER } from "$lib/contexts/account";
  import Button from "../ui/button/button.svelte";
  import ArgentX from "./button/argentX.svelte";
  import Controller from "./button/controller.svelte";
  import Other from "./button/other.svelte";

  let visible = $state(false);
  let loading = $state(true);

  let validWallets: ValidWallet[] = $state([]);

  // If we are on dev mode, only add the burner button.
  // Otherise, check for all wallets, and setup controller.
  // We need to store the wallet in a context, like other extensions (this is where extensionWallet comes in handy)
  // And if a login is asked (with the event wallet_login), open the popup with the found wallets,
  // wait for a successful login, and possibly open a popup to ask for the session popup explaining how it works.

  const setupPromises: Promise<any>[] = [
    setupAccount(dojoConfig),
    scanObjectForWalletsCustom(),
  ];

  const promisesToWait = Promise.all(setupPromises);

  onMount(() =>
    on(window, "wallet_login", async () => {
      console.log("EVENT!");
      loading = true;
      visible = true;
      // Ensure everything has loaded.
      await promisesToWait;
      loading = false;
    })
  );

  function getWalletButton(wallet: ValidWallet) {
    switch (wallet.wallet.id) {
      case "argentX":
        return ArgentX;
      case "controller":
        return Controller;
      default:
        return Other;
    }
  }
</script>

{#if visible}
  <div class="bg-black opacity-60 absolute w-screen h-screen top-0 left-0 z-40">
    &nbsp;
  </div>
  <div
    class="absolute top-absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white z-50 p-5 min-w-52 text-2xl"
  >
    {#if loading}
      Loading...
    {:else}
      WALLETS
      <div class="flex flex-col justify-stretch gap-2">
        {#each validWallets as wallet}
          {@const WalletButton = getWalletButton(wallet)}
          <WalletButton value={wallet.wallet} class="text-xl" />
        {/each}
      </div>
    {/if}
  </div>
{/if}
