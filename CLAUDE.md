# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PonziLand is a fully onchain, token-agnostic DeFi metagame built on Starknet. It's a multi-language project consisting of:
- Frontend: SvelteKit/TypeScript web application with widget-based UI
- Smart Contracts: Cairo contracts for Starknet blockchain using Dojo framework
- Backend: Rust-based indexer and meta-indexer services

## Development Environment Setup

```bash
# Enter development shell with all tools
nix develop

# Run database migrations
nix run .#migrate

# Create a new migration
nix run .#new-migration <migration_name>
```

## Common Development Commands

### Frontend (Client)
```bash
cd client

# Development
bun dev              # Local development
bun dev:sepolia      # Sepolia testnet
bun dev:mainnet      # Mainnet

# Building
bun build            # Standard build
bun build:sepolia    # Build for Sepolia
bun build:mainnet    # Build for Mainnet

# Testing
bun test             # Run tests
bun test:watch       # Run tests in watch mode

# Code Quality
bun run check        # Type check
bun run check:watch  # Type check in watch mode
bun prettier --write .   # Format code
bun prettier --check .   # Check formatting
```

### Smart Contracts (Dojo/Cairo)
```bash
cd contracts

# Local Development
katana --dev --dev.no-fee  # Start local blockchain
sozo build                 # Build contracts
sozo test                  # Run tests
# For deployment, ask the user for specific instructions

# Running local indexer
torii --world <WORLD_ADDRESS> --http.cors_origins "*"

# Code Quality
scarb fmt            # Format Cairo code
scarb fmt --check    # Check formatting
```

### Rust Backend
```bash
# Building
cargo build          # Build all crates
cargo build --bin indexer  # Build specific binary

# Code Quality
cargo fmt            # Format Rust code
cargo fmt --check    # Check formatting
cargo clippy         # Run linter

# Testing
cargo test           # Run tests
cargo nextest run    # Run tests with nextest (faster)
```

## Architecture Overview

### Widget System (Frontend)
The UI is built with a modular widget system that allows easy extension:
- Widgets live in `client/src/lib/components/widgets/`
- Each widget has its own directory with a `widget-<name>.svelte` file
- Register new widgets in `widget-provider.svelte` and `widget.config.ts`
- Use Svelte 5 runes for reactivity ($state, $derived, $effect)

### Smart Contract Structure (Dojo Framework)
- `/contracts/src/systems/` - Game actions (buy, claim, nuke, auction)
- `/contracts/src/models/` - Data models (land, auction)
- `/contracts/src/components/` - Reusable contract components
- Built with Dojo engine (https://book.dojoengine.org)
- All game logic is fully onchain using Cairo and Dojo framework

### Backend Services
- `crates/indexer` - Main indexing service that processes blockchain events
- `crates/chaindata` - Models and repository for blockchain data
- `crates/torii-ingester` - Ingests data from Torii (Dojo's indexer)
- Uses PostgreSQL for caching with read-heavy optimization

## Key Development Patterns

### Frontend Development
- Always use absolute imports from `$lib/`
- State management uses Svelte stores and runes
- Components should be typed with TypeScript
- Use Tailwind CSS for styling with the project's design system
- At the end of a modification batch / end of todolist Format the code

### Smart Contract Development
- Follow Dojo framework patterns for systems and models
- Use the existing components for common functionality (payable, taxes)
- Test contracts with `sozo test`
- Build with `sozo build`

### Rust Development
- Use SQLx for compile-time checked queries
- Follow the workspace structure for new crates
- Clippy is configured with pedantic warnings

## Testing Approach

### Frontend
- Unit tests with Vitest (`.test.ts` files alongside source)
- Test financial calculations and game mechanics thoroughly
- Run with `bun test` in the client directory

### Smart Contracts
- Tests in `contracts/src/tests/`
- Test actions, setup, and integrations
- Run with `sozo test`

### Rust
- Standard Rust testing patterns
- Use `cargo nextest` for faster test execution
- Integration tests for database operations

## Important Notes

- The project supports multiple networks (mainnet, sepolia, mainnet-test)
- All core game logic lives in smart contracts (fully onchain)
- The meta-indexer pattern enriches blockchain data for fast queries
- Token-agnostic design supports multiple tokens for land transactions
- Widget system is the primary way to extend UI functionality

## Dev Tips and Gotchas
- When you add a nix file, add it to the git before trying to run a command. Otherwise you might get a file not found error.