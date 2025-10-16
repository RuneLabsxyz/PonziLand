<script lang="ts">
  import { useAccount } from "../context/account.svelte.js";
  import type { StarknetWindowObject } from "@starknet-io/get-starknet-core";
  import { ChevronDown, ChevronUp } from "@lucide/svelte";
  import { onMount } from "svelte";
  import { on } from "svelte/events";
  import { Button } from "@ponziland/ui";
  import { Card } from "@ponziland/ui";

  let visible = $state(false);
  let loading = $state(true);
  let showAllWallets = $state(false);

  let validWallets: StarknetWindowObject[] = $state([]);

  // If we are on dev mode, only add the burner button.
  // Otherise, check for all wallets, and setup controller.
  // We need to store the wallet in a context, like other extensions (this is where extensionWallet comes in handy)
  // And if a login is asked (with the event wallet_login), open the popup with the found wallets,
  // wait for a successful login, and possibly open a popup to ask for the session popup explaining how it works.

  let account = $state<ReturnType<typeof useAccount>>();

  const promisesToWait = (async () => {
    account = useAccount();
    if (account != null) {
      validWallets = (await account.wait()).getAvailableWallets();
      console.log("validWallets", validWallets);
    }
  })();

  function closeModal() {
    loading = false;
    visible = false;
  }

  onMount(() => {
    on(window, "wallet_prompt", async () => {
      console.log("EVENT!");
      loading = true;
      visible = true;

      // Ensure everything has loaded.
      await promisesToWait;

      loading = false;
    });
  });

  async function login(id: string) {
    await account!.selectAndLogin(id);
    console.log("Logged in!");

    // TODO(#58): Split the session setup
    if (account!.getProvider()?.supportsSession()) {
      await account!.setupSession();
    }

    visible = false;
    // resolve waiting promises.
    window.dispatchEvent(new Event("wallet_login_success"));
  }
</script>

{#if visible}
  <div class="modal-backdrop">&nbsp;</div>
  <div class="modal-card">
    <Card>
      {#if loading}
        Loading...
      {:else}
        <div class="modal-content">
          <div class="modal-header">
            <div>WALLETS</div>
            <Button onclick={closeModal}>x</Button>
          </div>

          <div class="wallet-list">
            {#if validWallets.length >= 2}
              {#if !showAllWallets}
                {@const controllerWallet = validWallets.find(
                  (wallet) => wallet.id === "controller",
                )}
                {#if controllerWallet}
                  {@const image =
                    typeof controllerWallet.icon == "string"
                      ? controllerWallet.icon
                      : controllerWallet.icon.light}
                  <Button
                    class="wallet-button"
                    onclick={() => login(controllerWallet.id)}
                  >
                    <img
                      src={image}
                      alt={controllerWallet.name + " logo"}
                      class="wallet-icon-large"
                    />
                    <div class="wallet-info">
                      <div class="wallet-name">
                        {controllerWallet.name}
                      </div>
                      <div class="free-gas-badge">FREE GAS!</div>
                    </div>
                  </Button>
                  <Button
                    size="md"
                    variant="red"
                    onclick={() => (showAllWallets = true)}
                  >
                    <ChevronDown class="chevron-icon" />
                    <span>Want to use a different wallet?</span>
                  </Button>
                {/if}
              {:else}
                {#each validWallets as wallet}
                  {@const image =
                    typeof wallet.icon == "string"
                      ? wallet.icon
                      : wallet.icon.light}
                  <Button
                    class="wallet-button"
                    onclick={() => login(wallet.id)}
                  >
                    <img
                      src={image}
                      alt={wallet.name + " logo"}
                      class="icons"
                    />
                    <div class="wallet-info">
                      <div class="wallet-name">
                        {wallet.name}
                      </div>
                      {#if wallet.id == "controller"}
                        <div class="free-gas-badge">FREE GAS!</div>
                      {:else}
                        <div class="standard-badge">Standard</div>
                      {/if}
                    </div>
                  </Button>
                {/each}
                <Button size="md" onclick={() => (showAllWallets = false)}>
                  <ChevronUp class="chevron-icon" />
                  Show fewer options
                </Button>
              {/if}
            {:else}
              {#each validWallets as wallet}
                {@const image =
                  typeof wallet.icon == "string"
                    ? wallet.icon
                    : wallet.icon.light}
                <Button
                  class="wallet-button-single"
                  onclick={() => login(wallet.id)}
                >
                  <img src={image} alt={wallet.name + " logo"} class="icons" />
                  <div class="login-info">
                    <div class="wallet-name">Login</div>
                  </div>
                </Button>
              {/each}
            {/if}
          </div>
        </div>
      {/if}
    </Card>
  </div>
{/if}

<style>
  .icons {
    height: 2rem;
    padding: 0.5rem;
  }

  .modal-backdrop {
    background-color: black;
    opacity: 0.6;
    position: absolute;
    width: 100vw;
    height: 100vh;
    top: 0;
    left: 0;
    z-index: 1;
  }

  .modal-card {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 100;
    padding: 2.5rem;
    font-size: 1.5rem;
    min-width: 20rem;
  }

  .modal-content {
    margin: 0.75rem;
    margin-top: 0;
  }

  .modal-header {
    font-family: "PonziNumber", sans-serif;
    margin-bottom: 1.25 rem;
    display: flex;
    gap: 0.5rem;
    justify-content: space-between;
  }

  .wallet-list {
    display: flex;
    flex-direction: column;
    justify-content: stretch;
    gap: 0.5rem;
  }

  .wallet-icon-large {
    height: 2.5rem;
    padding: 0.5rem;
    padding-right: 1rem;
    margin: 1rem;
  }

  .wallet-info {
    display: flex;
    gap: 1rem;
    align-items: center;
    text-align: left;
    font-size: 0.875rem;
  }

  .login-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .wallet-name {
    font-size: 1.125rem;
  }

  .free-gas-badge {
    opacity: 0.7;
    color: #10b981;
    font-size: 0.875rem;
  }

  .standard-badge {
    opacity: 0.7;
    color: #dc2626;
    font-size: 0.875rem;
  }
</style>
