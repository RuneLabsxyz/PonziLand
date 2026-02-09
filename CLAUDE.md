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
- The syntax class={['base-classes', { 'conditional-class': condition }]} is a clean, idiomatic way to handle conditional styling in Svelte.

#### Date Utilities
Use centralized date utilities from `$lib/utils/date` for consistent date formatting:

**Basic Date Formatting:**
- `formatDate(dateString)` - Full date with time (e.g., "Dec 2, 2024, 10:30 AM")
- `formatDateOnly(dateString)` - Date only (e.g., "Dec 2, 2024")
- `formatTimeOnly(dateString)` - Time only (e.g., "10:30 AM")

**Duration Formatting:**
- `formatDuration(startDate, endDate)` - Duration between dates (e.g., "2d", "3h", "45m")
- `formatDurationFromNow(startDate)` - Duration from start to now
- `parseNukeTime(timeInSeconds)` - Parse seconds into nuke time format string (e.g., "2d 3h 45m")
- `parseNukeTimeComponents(timeInSeconds)` - Parse seconds into object with `{days, hours, minutes, toString()}` for when individual components are needed
- `formatDurationHMS(durationInSeconds)` - Format as HH:MM:SS for countdown displays

**History & Timestamps:**
- `formatTimestamp(timestamp)` - Format as "YYYY/MM/DD at HH:MM"
- `formatTimestampRelative(timestamp)` - Relative time (e.g., "2 hours ago", "just now")

**Validation:**
- `isValidDate(dateString)` - Check if date string is valid

**Important:** Always import and use these utilities instead of creating duplicate date formatting functions in components. This ensures consistency across the entire application.

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

## Communication Style

- Never use phrases like "Perfect!", "Here is the implementation", "Great!", or similar filler language
- Be direct and concise in responses
- Focus on the work, not on narrating it

## Git Workflow

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Rules:**

- First line must be clear and descriptive (max 72 characters)
- Use imperative mood ("add feature" not "added feature")
- No period at the end of the subject line

**Examples:**

```
feat: add challenge expiration timer
fix: prevent duplicate factory closures
refactor(wallet): simplify balance calculation
```

### Graphite Workflow

1. **Track branches**: After creating a branch, run:

   ```bash
   gt track
   ```

2. **Submit for review**: When task is complete (after all checks pass):
   ```bash
   gt submit
   ```

## Pre-Submit Checklist

Before marking a task as done, run these commands and fix any issues:

```bash
# 1. Format code
bun prettier --write .

# 2. Lint and fix
bun lint

# 3. Type check
bun check
```

Fix all errors before submitting. Do not submit code with formatting, linting, or type errors.

## Vibe Kanban Integration

Tasks are tracked through Vibe Kanban. The branch naming convention follows the pattern:

```
<initials>/<ticket-number>-<short-description>
```

Example: `vk/2844-create-agent-md`

When working on a task:

1. Ensure you're on the correct branch for the ticket
2. Track the branch with `gt track`
3. Make commits following conventional commits
4. Run all checks before completing
5. Submit with `gt submit` when done
