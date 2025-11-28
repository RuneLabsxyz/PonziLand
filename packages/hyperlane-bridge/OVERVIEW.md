Hyperlane Bridge Architecture

  Here's the complete structure of the Hyperlane bridge integration:

  Directory Structure

  PonziLand/
  ├── packages/hyperlane-bridge/          # Core bridge package (reusable library)
  │   └── src/lib/
  │       ├── index.ts                    # Package exports
  │       ├── config.ts                   # Hyperlane SDK initialization
  │       ├── hyperlane-store.svelte.ts   # Global Hyperlane state store
  │       ├── token-transfer-store.svelte.ts  # Transfer execution logic
  │       └── types.ts                    # TypeScript interfaces
  │
  ├── client/src/
  │   ├── lib/bridge/                     # Client-side bridge integration
  │   │   ├── config.ts                   # (duplicate - can be removed)
  │   │   ├── hyperlane-store.svelte.ts   # (duplicate - can be removed)
  │   │   ├── token-transfer-store.svelte.ts  # (duplicate - can be removed)
  │   │   ├── phantom.svelte.ts           # Phantom wallet store (Solana)
  │   │   └── TransferForm.svelte         # UI component for transfers
  │   │
  │   └── routes/
  │       ├── bridge-test/+page.svelte    # Test page for the bridge
  │       └── api/rpc/solanamainnet/      # RPC proxy for Solana (CORS)
  │           └── +server.ts
  │
  └── patches/                            # Bun patches for dependencies
      ├── @hyperlane-xyz%2Fsdk@18.2.0.patch
      ├── @hyperlane-xyz%2Fcore@9.0.9.patch
      └── zksync-web3@0.14.4.patch        # ethers v5 compatibility

  Dependencies

  @ponziland/hyperlane-bridge package:
  {
    "dependencies": {
      "@hyperlane-xyz/registry": "^23.1.0",  // Chain metadata & warp routes
      "@hyperlane-xyz/sdk": "^18.2.0",       // Core Hyperlane SDK
      "viem": "^2.0.0",                      // EVM utilities
      "ethers": "^5.7.2"                     // Required by Hyperlane SDK
    },
    "peerDependencies": {
      "svelte": "^5.0.0",
      "starknet": "^8.0.0"
    }
  }

  Client additional deps:
  {
    "@solana/web3.js": "catalog:",    // Solana SDK for Phantom
    "ethers-v5": "npm:ethers@^5.7.2"  // Aliased ethers v5 for Hyperlane
  }

  Architecture Layers

  ┌─────────────────────────────────────────────────────────────┐
  │                     UI Layer (Svelte)                       │
  │  ┌──────────────────────────────────────────────────────┐   │
  │  │  TransferForm.svelte                                 │   │
  │  │  - Chain/token selection                             │   │
  │  │  - Wallet connection UI                              │   │
  │  │  - Transfer status display                           │   │
  │  └──────────────────────────────────────────────────────┘   │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                    State Stores (Svelte 5 Runes)            │
  │  ┌────────────────────┐  ┌─────────────────────────────┐    │
  │  │  hyperlaneStore    │  │  tokenTransferStore         │    │
  │  │  - warpCore        │  │  - status (idle/preparing/  │    │
  │  │  - multiProvider   │  │    transferring/success)    │    │
  │  │  - registry        │  │  - executeTransfer()        │    │
  │  │  - isReady         │  │  - getTokenBalance()        │    │
  │  └────────────────────┘  └─────────────────────────────┘    │
  │                                                             │
  │  ┌────────────────────┐                                     │
  │  │ phantomWalletStore │  (Solana wallet connection)         │
  │  │  - isConnected     │                                     │
  │  │  - walletAddress   │                                     │
  │  │  - connect()       │                                     │
  │  └────────────────────┘                                     │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 Hyperlane SDK Layer                         │
  │  ┌────────────────────────────────────────────────────┐     │
  │  │  initializeHyperlane()                             │     │
  │  │  1. Fetch metadata from GithubRegistry             │     │
  │  │  2. Enrich with mailbox addresses                  │     │
  │  │  3. Override RPC URLs (env vars or proxy)          │     │
  │  │  4. Filter routes to Starknet + Solana only        │     │
  │  │  5. Create WarpCore instance                       │     │
  │  └────────────────────────────────────────────────────┘     │
  │                                                             │
  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐      │
  │  │ WarpCore     │  │MultiProtocol │  │ GithubRegistry│      │
  │  │ (transfers)  │  │  Provider    │  │ (metadata)    │      │
  │  └──────────────┘  └──────────────┘  └───────────────┘      │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 Wallet Providers                            │
  │  ┌────────────────────┐  ┌────────────────────────┐         │
  │  │  Starknet          │  │  Solana (Phantom)      │         │
  │  │  - Controller      │  │  - window.solana       │         │
  │  │  - ArgentX         │  │  - signAndSendTx()     │         │
  │  │  - account.execute │  │                        │         │
  │  └────────────────────┘  └────────────────────────┘         │
  └─────────────────────────────────────────────────────────────┘
                                │
                                ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                 RPC Layer                                   │
  │  ┌────────────────────┐  ┌────────────────────────┐         │
  │  │  Starknet RPC      │  │  Solana RPC            │         │
  │  │  (direct)          │  │  (via /api/rpc proxy   │         │
  │  │                    │  │   to avoid CORS)       │         │
  │  └────────────────────┘  └────────────────────────┘         │
  └─────────────────────────────────────────────────────────────┘

  Data Flow for a Transfer

  1. User selects: Origin Chain → Destination Chain → Token → Amount
                                │
  2. TransferForm calls:  tokenTransferStore.executeTransfer(params, walletProvider)
                                │
  3. TokenTransferStore:  ┌─────▼─────┐
                          │ preparing │
                          └─────┬─────┘
                                │
  4. Find token:          hyperlaneStore.warpCore.tokens.find(...)
                                │
  5. Create amount:       originToken.amount(parseUnits(amount, decimals))
                                │
  6. Check collateral:    warpCore.isDestinationCollateralSufficient(...)
                                │
  7. Get transactions:    warpCore.getTransferRemoteTxs({...})
                                │
                          ┌─────▼──────────┐
                          │  transferring  │
                          └─────┬──────────┘
                                │
  8. Execute based on chain type:
     ├── Starknet: account.execute(transactions)
     └── Solana:   wallet.signAndSendTransaction(transactions)
                                │
                          ┌─────▼─────┐
                          │  success  │
                          └───────────┘

  Key Configuration

  RPC URL Resolution (config.ts:30-44):
  1. Check for VITE_<CHAIN>_RPC_URL environment variable
  2. For solanamainnet: use local proxy at /api/rpc/solanamainnet
  3. Otherwise: use default RPC from Hyperlane registry

  Supported Chains (config.ts:64):
  const SUPPORTED_CHAINS = ['starknet', 'solana', 'solanamainnet'];

  ethers v5/v6 Compatibility

  The Hyperlane SDK requires ethers v5, but other deps need v6. Handled via:

  1. vite.config.ts: Custom esbuild plugin redirects ethers imports from @hyperlane-xyz/* to ethers-v5
  2. patches/: Bun patches for @hyperlane-xyz/sdk, @hyperlane-xyz/core, and zksync-web3