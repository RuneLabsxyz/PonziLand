# Example Usage

This example shows how to integrate @ponziland/account into a SvelteKit application.

## 1. Install the package

```bash
npm install @ponziland/account
```

## 2. Set up in your root layout

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { setupAccount } from '@ponziland/account';
  import { onMount } from 'svelte';

  onMount(async () => {
    await setupAccount();
  });
</script>

<slot />
```

## 3. Use in your pages

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { 
    SelectWalletModal, 
    OnboardingWalletInfo,
    accountDataProvider,
    useAccount,
    shortenHex,
    padAddress
  } from '@ponziland/account';

  $: address = accountDataProvider.address;
  $: isConnected = accountDataProvider.isConnected;
  
  function handleConnect() {
    console.log('Wallet connected!');
  }
</script>

<!-- The wallet selection modal -->
<SelectWalletModal />

<!-- Simple connection button -->
<OnboardingWalletInfo onconnect={handleConnect} />

<!-- Or build your own UI -->
{#if isConnected && address}
  <div>
    <p>Connected: {shortenHex(padAddress(address), 4)}</p>
    <button onclick={() => useAccount()?.disconnect()}>
      Disconnect
    </button>
  </div>
{:else}
  <button onclick={() => useAccount()?.promptForLogin()}>
    Connect Wallet
  </button>
{/if}
```

## 4. Access wallet state anywhere

```svelte
<!-- src/lib/components/MyComponent.svelte -->
<script lang="ts">
  import { accountDataProvider } from '@ponziland/account';
  
  $: if (accountDataProvider.isConnected) {
    console.log('Wallet address:', accountDataProvider.address);
    console.log('Provider:', accountDataProvider.providerName);
  }
</script>
```

## 5. Use the account interface

```svelte
<script lang="ts">
  import { useAccount } from '@ponziland/account';
  
  async function performTransaction() {
    const accountManager = useAccount();
    const provider = accountManager?.getProvider();
    const account = provider?.getAccount();
    
    if (account) {
      // Use the Starknet account interface
      // await account.execute(...);
    }
  }
</script>
```