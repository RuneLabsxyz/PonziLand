# @ponziland/hyperlane-bridge

A Svelte library for cross-chain token transfers using Hyperlane. Supports Starknet, Solana, and EVM chains with reactive state management and ready-to-use UI components.

## Features

- 🌉 **Multi-chain support**: Starknet, Solana (coming soon), and EVM chains (coming soon)
- ⚡ **Reactive stores**: Built with Svelte 5 runes for optimal reactivity
- 🎨 **Pre-built UI**: Transfer component ready to use
- 🔧 **Configurable**: Custom RPC URLs and chain selection
- 📦 **Type-safe**: Full TypeScript support

## Installation

```bash
npm install @ponziland/hyperlane-bridge
# or
bun add @ponziland/hyperlane-bridge
```

## Quick Start

### 1. Initialize Hyperlane

The Hyperlane store automatically initializes on import, but you can also manually initialize:

```svelte
<script lang="ts">
  import { hyperlaneStore } from '@ponziland/hyperlane-bridge';

  // Check initialization status
  $: isReady = hyperlaneStore.isReady;
  $: error = hyperlaneStore.error;
</script>

{#if isReady}
  <p>Hyperlane is ready!</p>
{:else if error}
  <p>Error: {error}</p>
{:else}
  <p>Initializing Hyperlane...</p>
{/if}
```

### 2. Use the Transfer Component

The `TransferFrom` component provides a complete UI for token transfers:

```svelte
<script lang="ts">
  import { TransferFrom } from '@ponziland/hyperlane-bridge';
</script>

<TransferFrom />
```

### 3. Use Stores Directly

For custom implementations, use the stores directly:

```svelte
<script lang="ts">
  import { hyperlaneStore, tokenTransferStore } from '@ponziland/hyperlane-bridge';

  async function transfer() {
    const result = await tokenTransferStore.executeTransfer({
      originChain: 'starknet',
      destinationChain: 'solanamainnet',
      tokenSymbol: 'USDC',
      amount: '10',
      recipient: '0x...',
      sender: '0x...'
    });

    if (result.success) {
      console.log('Transfer successful!', result.txHashes);
    } else {
      console.error('Transfer failed:', result.error);
    }
  }
</script>
```

## API Reference

### Stores

#### `hyperlaneStore`

Reactive store for Hyperlane initialization state.

**Properties:**
- `isReady: boolean` - Whether Hyperlane is initialized
- `error: string | null` - Initialization error if any
- `warpCore: WarpCore | null` - Hyperlane WarpCore instance
- `multiProvider: MultiProtocolProvider | null` - Multi-chain provider
- `registry: GithubRegistry | null` - Hyperlane registry
- `chainAddresses: ChainMap<Record<string, string>> | null` - Chain addresses

**Methods:**
- `reinitialize(): Promise<void>` - Reinitialize Hyperlane

#### `tokenTransferStore`

Reactive store for managing token transfers.

**Properties:**
- `status: TransferStatus` - Current transfer status ('idle' | 'preparing' | 'approving' | 'transferring' | 'success' | 'error')
- `isLoading: boolean` - Whether transfer is in progress
- `error: string | null` - Transfer error if any
- `txHashes: string[]` - Transaction hashes from the transfer

**Methods:**
- `executeTransfer(params: TransferParams): Promise<TransferResult>` - Execute a token transfer
- `getTokenBalance(chainName: string, tokenSymbol: string, address: string): Promise<TokenAmount | null>` - Get token balance
- `clearError(): void` - Clear error state
- `reset(): void` - Reset transfer state

### Components

#### `TransferFrom`

Pre-built UI component for token transfers with wallet integration.

**Features:**
- Automatic chain detection (Starknet, Solana, EVM)
- Wallet connection status
- Balance checking
- Transfer execution with feedback
- Error handling

### Functions

#### `initializeHyperlane()`

Initialize Hyperlane with custom configuration.

```typescript
import { initializeHyperlane } from '@ponziland/hyperlane-bridge';

const { warpCore, multiProvider, registry, chainAddresses } = await initializeHyperlane();
```

**Returns:**
- `warpCore: WarpCore` - Hyperlane WarpCore instance
- `multiProvider: MultiProtocolProvider` - Multi-chain provider
- `registry: GithubRegistry` - Hyperlane registry
- `chainAddresses: ChainMap<Record<string, string>>` - Chain addresses

## Configuration

### Custom RPC URLs

You can configure custom RPC URLs using environment variables:

```bash
# .env
VITE_STARKNET_RPC_URL=https://your-starknet-rpc.com
VITE_SOLANAMAINNET_RPC_URL=https://your-solana-rpc.com
```

The package automatically:
1. Uses custom RPC URLs from environment variables
2. Falls back to local RPC proxy for CORS bypass
3. Uses public RPCs from Hyperlane registry

### RPC Proxy (Optional)

To avoid CORS issues with public RPCs, you can set up a local proxy. See `examples/rpc-proxy/+server.ts` for a SvelteKit implementation:

```typescript
// src/routes/api/rpc/[chain]/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const RPC_URLS: Record<string, string> = {
  solanamainnet: 'https://api.mainnet-beta.solana.com',
  // Add more chains as needed
};

export const POST: RequestHandler = async ({ params, request }) => {
  const { chain } = params;
  const rpcUrl = RPC_URLS[chain];

  if (!rpcUrl) {
    throw error(404, `RPC not found for chain: ${chain}`);
  }

  const body = await request.json();
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return json(await response.json());
};
```

## Supported Chains

### Currently Supported
- **Starknet** - Full support with wallet integration

### Coming Soon
- **Solana** - In development
- **EVM chains** - Ethereum, Arbitrum, Optimism, Polygon, etc.

## Types

```typescript
interface TransferParams {
  originChain: string;
  destinationChain: string;
  tokenSymbol: string;
  amount: string;
  recipient: string;
  sender: string;
}

interface TransferResult {
  success: boolean;
  txHashes: string[];
  error?: string;
}

type TransferStatus = 'idle' | 'preparing' | 'approving' | 'transferring' | 'success' | 'error';
```

## Examples

### Basic Transfer

```svelte
<script lang="ts">
  import { tokenTransferStore } from '@ponziland/hyperlane-bridge';

  let amount = $state('10');
  let recipient = $state('');

  async function handleTransfer() {
    await tokenTransferStore.executeTransfer({
      originChain: 'starknet',
      destinationChain: 'solanamainnet',
      tokenSymbol: 'USDC',
      amount,
      recipient,
      sender: '0x...' // Your connected wallet address
    });
  }
</script>

<input bind:value={amount} placeholder="Amount" />
<input bind:value={recipient} placeholder="Recipient" />
<button onclick={handleTransfer}>Transfer</button>
```

### Check Balance

```svelte
<script lang="ts">
  import { tokenTransferStore } from '@ponziland/hyperlane-bridge';

  let balance = $state<string | null>(null);

  async function checkBalance() {
    const tokenAmount = await tokenTransferStore.getTokenBalance(
      'starknet',
      'USDC',
      '0x...' // Your wallet address
    );

    if (tokenAmount) {
      balance = tokenAmount.getDecimalFormattedAmount();
    }
  }
</script>

<button onclick={checkBalance}>Check Balance</button>
{#if balance}
  <p>Balance: {balance} USDC</p>
{/if}
```

### Monitor Transfer Status

```svelte
<script lang="ts">
  import { tokenTransferStore } from '@ponziland/hyperlane-bridge';

  $: status = tokenTransferStore.status;
  $: txHashes = tokenTransferStore.txHashes;
  $: error = tokenTransferStore.error;
</script>

<div>
  <p>Status: {status}</p>

  {#if txHashes.length > 0}
    <p>Transaction Hashes:</p>
    <ul>
      {#each txHashes as hash}
        <li>{hash}</li>
      {/each}
    </ul>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}
</div>
```

## Development

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Build the package
bun run build

# Type check
bun run check
```

## Integration with Account Management

This package works seamlessly with `@ponziland/account` for wallet management:

```svelte
<script lang="ts">
  import { setupAccount, useAccount } from '@ponziland/account';
  import { TransferFrom } from '@ponziland/hyperlane-bridge';
  import { onMount } from 'svelte';

  onMount(async () => {
    await setupAccount();
  });
</script>

<TransferFrom />
```

## Troubleshooting

### CORS Errors
If you encounter CORS errors when connecting to RPC endpoints, set up the RPC proxy (see Configuration section).

### Insufficient Collateral
Ensure the destination chain has sufficient collateral for the token being transferred. The transfer will fail with "Insufficient collateral on destination chain" if not.

### Wallet Connection
Make sure you have a compatible wallet installed:
- **Starknet**: Argent X or Braavos
- **Solana**: Phantom (coming soon)
- **EVM**: MetaMask or similar (coming soon)

## License

MIT

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.
