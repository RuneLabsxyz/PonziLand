<script lang="ts">
  import { SelectWalletModal, OnboardingWalletInfo, setupAccount } from '$lib';
  import { onMount } from 'svelte';

  let initialized = $state(false);

  onMount(async () => {
    // Initialize the account manager
    await setupAccount();
    initialized = true;
  });
</script>

<h1>@ponziland/account Demo</h1>
<p>This is a demo of the account management library for Starknet wallets.</p>

<div class="demo-container">
  <h2>Components:</h2>
  <ul>
    <li><code>SelectWalletModal</code> - Wallet selection modal that appears when connecting</li>
    <li><code>OnboardingWalletInfo</code> - Shows connection status and connect button</li>
  </ul>

  <h2>Try it out:</h2>
  <p>Click the "CONNECT WALLET" button in the top right to see the wallet selection modal.</p>
</div>

<!-- Include the components -->
{#if initialized}
  <SelectWalletModal />
  <OnboardingWalletInfo enablePhantom={true} />
{:else}
  <p>Initializing account manager...</p>
{/if}

<style>
  .demo-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
  }

  h1 {
    margin-bottom: 1rem;
  }

  h2 {
    margin-top: 2rem;
    margin-bottom: 1rem;
  }

  ul {
    margin-left: 2rem;
  }

  code {
    background: #f4f4f4;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
  }
</style>
