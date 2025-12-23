# Midgard

Midgard is a POC implementation of the Yellow Paper DeFi economic simulation for PonziLand. It implements a game-theoretic system where **Tycoons** stake GARD tokens on factories and **Challengers** compete for rewards.

## Operation Modes

### POC Mode (Simulation)
- Uses `game-state.svelte.ts` for in-memory simulation
- Time acceleration: 1 real second = 1 game hour
- No persistence, purely client-side
- Access via `/midgard/simulation`

### API Mode (Production)
- Uses `api-store.svelte.ts` with REST endpoints
- Database-backed persistence (SQLite/PostgreSQL)
- Real-time factory stats with 5-second refresh
- Access via `/midgard/my-lands` and `/midgard/factories`

## Directory Structure

```
midgard/
├── api-client.ts              # REST API bindings (fetch wrapper)
├── api-store.svelte.ts        # Reactive store for API mode (Svelte 5 runes)
├── constants.ts               # Yellow paper parameters (burn rate, inflation ramp, etc.)
├── formulas.ts                # Economic calculations (burn, inflation, challenge costs)
├── game-state.svelte.ts       # In-memory POC simulation store
├── ponzi-land-store.svelte.ts # PonziLand blockchain integration (Dojo/Torii)
├── types.ts                   # TypeScript domain models
├── components/                # UI components + Flappy Bird game
│   ├── FactoryCard.svelte
│   ├── FactoryStats.svelte
│   ├── LandCard.svelte
│   ├── ChallengeForm.svelte
│   ├── ChallengeHistory.svelte
│   ├── Nav.svelte
│   └── game/                  # Flappy Bird implementation
│       ├── FlappyGameModal.svelte
│       ├── FlappyGameCanvas.svelte
│       ├── game-engine.ts
│       ├── game-renderer.ts
│       └── game-types.ts
├── db/                        # Database layer
│   ├── index.ts               # Singleton DB instance
│   └── schema.sqlite.ts       # Drizzle ORM schema
└── services/                  # Business logic
    ├── wallet.service.ts      # Wallet & token operations
    ├── factory.service.ts     # Factory lifecycle
    ├── challenge.service.ts   # Two-phase challenge workflow
    └── close.service.ts       # Factory closure & settlement
```

## Routes (`/routes/midgard/`)

| Route | Description |
|-------|-------------|
| `/my-lands` | Manage factories on owned PonziLand plots |
| `/factories` | Browse and challenge active factories |
| `/factories/[id]` | Detailed factory view with live economics |
| `/simulation` | Client-side Yellow Paper simulation |
| `/simulation/tokenomics` | Simulation token analytics |
| `/tokenomics` | Production token flow analytics |
| `/api/*` | REST API endpoints for wallets, factories, challenges, stats |

## Core Concepts

### Factories
- Tycoons stake GARD tokens on a land to create a factory
- Factory score is set by playing a Flappy Bird game
- Factories accumulate burn obligation over time
- Inflation is earned based on staked amount and time (with exponential bonus ramp)

### Challenges
Two-phase process:
1. **Create**: Challenger pays ticket cost (burned), stakes locked
2. **Complete**: Challenger plays game, winner determined by score comparison
   - Win: Challenger receives `gamma * ticket` from available inflation
   - Loss: Factory's burn obligation reduced by `beta * ticket`

### Token Economics (Yellow Paper)
- **Burn**: `B(t) = rate * stakedAmount` - linear obligation growth
- **Inflation**: `I(t) = rate * stakedAmount * (1 + maxBonus * (1 - e^(-elapsed/rampPeriod)))` - exponential bonus
- **Effective Burn**: Reduced by challenge losses (beta factor)
- **Available Inflation**: Remaining after challenge payouts

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                              │
│     Routes (/midgard/*) + Components (components/)       │
└──────────────────────────┬──────────────────────────────┘
                           │
               ┌───────────┴───────────┐
               │                       │
    ┌──────────▼──────────┐  ┌────────▼─────────┐
    │   game-state        │  │   api-store      │
    │   .svelte.ts        │  │   .svelte.ts     │
    │   (POC Simulation)  │  │   (Production)   │
    └──────────┬──────────┘  └────────┬─────────┘
               │                      │
               │              ┌───────┴───────┐
               │              │               │
               │      ┌───────▼─────┐  ┌─────▼────────┐
               │      │ api-client  │  │  services/   │
               │      │ (REST API)  │  │ (DB queries) │
               │      └───────┬─────┘  └─────┬────────┘
               │              │              │
               │              └───────┬──────┘
               │                      │
               │            ┌─────────▼─────────┐
               │            │    Database       │
               │            │  (SQLite/Pg)      │
               └────────────┤  Drizzle ORM      │
                            └───────────────────┘
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `wallets` | User accounts with GARD balances |
| `factories` | Factory instances with state and aggregates |
| `challenges` | Challenge attempts with two-phase workflow |
| `factoryClosures` | Historical closure records |
| `tokenEvents` | Audit trail (LOCK, UNLOCK, MINT, BURN) |

## Key Constants (`constants.ts`)

| Constant | Value | Description |
|----------|-------|-------------|
| `BURN_RATE` | 0.001 | GARD burned per second |
| `INFLATION_RAMP` | 604800 (7 days) | Time to reach max inflation bonus |
| `MAX_BONUS` | 5 | Maximum inflation multiplier |
| `ALPHA` | 0.1 | Ticket cost as % of effective burn |
| `BETA` | 0.9 | Burn reduction from challenge losses |
| `GAMMA` | 1.9 | Win reward multiplier |

## Integration with PonziLand

`ponzi-land-store.svelte.ts` connects to the main PonziLand blockchain via Dojo/Torii:
- Fetches owned lands with coordinates and stake amounts
- Subscribes to real-time updates
- Enables factory creation only on owned lands
