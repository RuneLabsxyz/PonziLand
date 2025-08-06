# @ponziland/account

A Svelte library for Starknet wallet connection and account management, providing ready-to-use components for wallet selection and connection state management.

## Installation

```bash
npm install @ponziland/account
```

## Usage

### 1. Initialize the account manager

In your root layout or app component, initialize the account manager:

```svelte
<script lang="ts">
  import { setupAccount } from '@ponziland/account';
  import { onMount } from 'svelte';

  onMount(async () => {
    await setupAccount();
  });
</script>
```

### 2. Add the components

Include the wallet modal and connection button in your app:

```svelte
<script lang="ts">
  import { SelectWalletModal, OnboardingWalletInfo } from '@ponziland/account';
</script>

<!-- Wallet selection modal -->
<SelectWalletModal />

<!-- Connection button/status -->
<OnboardingWalletInfo onconnect={() => console.log('Connected!')} />
```

### 3. Access wallet state

You can access the wallet state anywhere in your application:

```svelte
<script lang="ts">
  import { accountDataProvider, useAccount } from '@ponziland/account';

  // Access reactive state
  let isConnected = $derived(accountDataProvider.isConnected);
  let address = $derived(accountDataProvider.address);

  // Access account manager methods
  const accountManager = useAccount();
  
  async function disconnect() {
    accountManager?.disconnect();
  }
</script>

{#if isConnected}
  <p>Connected: {address}</p>
  <button onclick={disconnect}>Disconnect</button>
{/if}
```

## Components

### SelectWalletModal

A modal that displays available Starknet wallets for connection. It automatically appears when `promptForLogin()` is called.

### OnboardingWalletInfo

A component that shows the current connection status and provides a connect button when disconnected.

Props:
- `onconnect?: () => void` - Callback function called after successful connection

## API

### setupAccount()

Initializes the account manager. Must be called once before using any other features.

### useAccount()

Returns the account manager instance with methods for wallet interaction:

- `promptForLogin(): Promise<void>` - Shows the wallet selection modal
- `disconnect(): void` - Disconnects the current wallet
- `getAvailableWallets()` - Returns list of available wallets
- `getProvider()` - Returns the current wallet provider
- `setupSession()` - Sets up session for supported wallets

### accountDataProvider

Reactive state object containing:

- `isConnected: boolean` - Connection status
- `address?: string` - Connected wallet address
- `walletAccount?: AccountInterface` - Starknet account interface
- `providerName?: string` - Name of the connected wallet

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build the package
npm run build

# Preview the package
npm run preview
```

## License

MIT