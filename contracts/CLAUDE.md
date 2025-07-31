# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
IS WRITING IN CAIRO 2.10.1 WITH DOJO engine framework v1.6.0-alpha.2
USE CAIRO-CODER MCP 
VALIDATE EACH TIME THE CORRECT SINTAXIS
This is the smart contracts directory for PonziLand - a fully onchain, token-agnostic DeFi metagame built on Starknet using the Dojo framework. The contracts implement a land ownership game where players can purchase, trade, and earn from virtual land plots through a sophisticated tax and staking mechanism.


## Rules
try to always create or refactor the code thinking in the best practices and architecture of the Dojo framework and Cairo language.And thinking in clean code.
do documentation thinkin in nat spect and see the documentation already created in other files

## Principal repository of dojo framework
https://github.com/dojoengine/dojo

## Examples of repositories using cairo and dojo for onchain games
https://github.com/Provable-Games/death-mountain/tree/main/contracts

## Code Conventions
Cairo 2.10.1 syntax for smart contracts
Cairo formatting: scarb fmt


## Common Development Commands

### Building and Testing
```bash
# Build contracts (from contracts directory)
sozo build

# Run all tests
sozo test

# Run specific test function
sozo test test_function_name

# Format Cairo code
scarb fmt

# Check formatting without changing files
scarb fmt --check

# Quick build and migrate for development
scarb run migrate
```

### Local Development Environment
```bash
# Terminal 1: Start local Starknet node
katana --dev --dev.no-fee

# Terminal 2: Build and deploy
sozo build
sozo migrate

# Terminal 3: Start indexer (replace <WORLD_ADDRESS> with deployed world address)
torii --world <WORLD_ADDRESS> --http.cors_origins "*"
```

### Network-Specific Deployment
```bash
# Deploy to Sepolia testnet
sozo -P sepolia migrate
# or use deployment script:
./scripts/deploy-sepolia.sh

# Deploy to mainnet
sozo -P mainnet migrate
# or use deployment script:
./scripts/deploy-mainnet.sh

# Validate deployment for walnut
sozo -P sepolia walnut verify
```

### Development Profiles
- `dev` - Local katana development (default)
- `sepolia` - Sepolia testnet
- `mainnet` - Starknet mainnet
- `mainnet-test` - Mainnet testing environment

## Smart Contract Architecture

### Dojo Framework Structure
The project follows Dojo's ECS (Entity Component System) architecture:

**Systems** (`src/systems/`) - Entry points for game logic:
- `actions.cairo` - Main game actions (bid, buy, claim, increase_price, increase_stake)
- `auth.cairo` - Authorization and access control for admin functions
- `config.cairo` - Global configuration management
- `token_registry.cairo` - Token whitelist and validation

**Models** (`src/models/`) - Data structures stored in the world:
- `land.cairo` - Land ownership, pricing, and level progression (`Land`, `LandStake`)
- `auction.cairo` - Auction state and price decay logic (`Auction`)
- `config.cairo` - Global game configuration parameters (`Config`)

**Components** (`src/components/`) - Reusable business logic:
- `payable.cairo` - Token transfer validation and execution with allowance checks
- `taxes.cairo` - Tax calculation, distribution, and neighbor-based yield logic
- `stake.cairo` - Staking mechanism validation and anti-nuking protection

### Key Architecture Patterns

**Component-Based Validation**: Each component handles specific validation logic:
- `PayableComponent` validates token transfers and balances
- `TaxesComponent` manages neighbor relationships and yield calculations
- `StakeComponent` ensures sufficient stake for anti-nuking protection

**Modular Helper System** (`src/helpers/`):
- `coord.cairo` - Grid coordinate system and neighbor calculations
- `taxes.cairo` - Tax rate calculations and time-based formulas  
- `land.cairo` - Land utility functions and validation
- `circle_expansion.cairo` - Neighbor discovery in expanding circles

**Security Implementation**:
- OpenZeppelin ReentrancyGuard on all state-changing functions
- Access control through Dojo's built-in authorization system
- Input validation through component-based architecture
- Safe math operations with overflow protection

### Game Logic Flow

**Land Acquisition**:
1. Auction created for unowned land with Dutch auction price decay
2. Player bids with token and stake amount
3. Land ownership transfers, auction ends
4. Alternative: Direct purchase from current owner

**Tax System**:
1. Land generates taxes based on neighbor land values
2. Tax rate decreases with land level progression
3. Owners must maintain sufficient stake to prevent "nuking"
4. Tax collection triggers neighbor health checks

**Multi-Token Architecture**:
- Each land can use different ERC20 tokens for pricing/staking
- Token registry system validates supported tokens
- Ekubo integration for price discovery and liquidity

## Testing Architecture
here we can see how is the flow about the contracts and the game

### Test Structure (`src/tests/`)
- `setup.cairo` - Test world setup, mock contracts, and helper functions
- `actions.cairo` - Integration tests for all game actions and edge cases

### Test Utilities
- Dojo's `spawn_test_world` for isolated test environments
- Mock ERC20 tokens and Ekubo core contracts
- Time manipulation for testing time-dependent logic
- Comprehensive setup function with pre-configured test data

### Key Configuration Constants (`src/consts.cairo`)

### Critical Functions to get like an example for sintaxys
- Token transfers in `payable.cairo` - handles allowances and balance checks
- Tax calculations in `taxes.cairo` - complex neighbor-based yield calculations
- Auction logic in `actions.cairo` - time-based price decay and bidding
- Stake management across ownership transfers


### Documentation
- `DEVELOPMENT.md` - Comprehensive development guide for smart contracts
- `README.md` - High-level overview of the project and setup instructions

