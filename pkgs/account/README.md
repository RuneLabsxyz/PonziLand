# @ponziland/account

A Svelte library for Starknet wallet connection and account management, providing ready-to-use components for wallet selection and connection state management. Also supports optional Phantom (Solana) wallet integration.

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
    // Using default configuration (mainnet)
    await setupAccount();
    
    // Or with custom configuration
    await setupAccount({
      chainId: 'sepolia', // 'mainnet' or 'sepolia'
      rpcUrl: 'https://your-custom-rpc-url.com'
    });
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

<!-- Connection button/status (Starknet only) -->
<OnboardingWalletInfo onconnect={() => console.log('Connected!')} />

<!-- Or with Phantom wallet support -->
<OnboardingWalletInfo 
  enablePhantom={true}
  onconnect={() => console.log('Connected!')} 
/>
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
- `enablePhantom?: boolean` - Enable Phantom (Solana) wallet connection button (default: false)

## API

### setupAccount(config?)

Initializes the account manager. Must be called once before using any other features.

Parameters:

- `config?: { chainId?: 'mainnet' | 'sepolia', rpcUrl?: string }` - Optional configuration
  - `chainId`: The Starknet chain to connect to (default: 'mainnet')
  - `rpcUrl`: Custom RPC URL (default: '<https://api.cartridge.gg/x/starknet/mainnet>')

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

### Configuration Functions

#### configureAccount(config)

Updates the account configuration after initialization.

```typescript
import { configureAccount } from '@ponziland/account';

configureAccount({
  chainId: 'sepolia',
  rpcUrl: 'https://your-rpc-url.com'
});
```

#### getAccountConfig()

Returns the current configuration.

```typescript
import { getAccountConfig } from '@ponziland/account';

const config = getAccountConfig();
console.log(config.chainId); // 'mainnet' or 'sepolia'
console.log(config.rpcUrl);
```

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

## Multi-Wallet Support

### Phantom Wallet (Solana)

The library includes optional support for Phantom wallet connections:

```svelte
<script lang="ts">
  import { phantomWalletStore } from '@ponziland/account';
  
  // Access Phantom wallet state
  let phantomConnected = $derived(phantomWalletStore.isConnected);
  let phantomAddress = $derived(phantomWalletStore.walletAddress);
  
  // Connect/disconnect Phantom
  async function connectPhantom() {
    await phantomWalletStore.connect();
  }
  
  async function disconnectPhantom() {
    await phantomWalletStore.disconnect();
  }
</script>
```

## Todos

- [ ] Bravoos wallet support
- [ ] Custom policies for signing tx

## License

MIT

