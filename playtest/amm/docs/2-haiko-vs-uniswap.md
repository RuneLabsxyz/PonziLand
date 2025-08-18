# Haiko vs Uniswap

This document compares Haiko's AMM implementation to Uniswap's [V3](https://github.com/Uniswap/v3-core) and [V4](https://github.com/Uniswap/v4-core) implementations. It aims to identify key differences in order to assist auditors with their review of the Haiko codebase.

It should be read alongside the [Technical Overview](./1-technical-overview.md) for a high-level understanding of the protocol.

### Key differences

1. Naming conventions
2. Contract architecture
3. Market types
4. Limit orders
5. Strategies
6. Limits vs ticks
7. Data types

## 1. Naming conventions

The table below summarises the key terminology used by Haiko, and their closest analogue from Uniswap.

| Term                 | Equivalent to                                         |
| -------------------- | ----------------------------------------------------- |
| Market               | Pool                                                  |
| Base asset / token   | None (Uniswap's token0 and token1 are order agnostic) |
| Quote asset / token  | None (as above)                                       |
| Limit                | Tick                                                  |
| Width                | Tick spacing                                          |
| Fee factor           | Fee growth inside                                     |
| Threshold sqrt price | SqrtPriceLimit                                        |

#### Markets

Markets are similar to pools, except they are defined over an explicit base and quote asset pair. Strategies often rely on oracle feeds defined over specific base and quote assets, so this distinction is useful.

#### Limits

Limits are similar to ticks, except the have a lower minimum width of `0.00001 (1e-5)` instead of `0.0001 (1e-4)`. The current range of valid limits is `[-7906625, 7906625]` rather than `[-887272, 887272]`.

#### Width

Width is identical to tick spacing (except with a lower minimum width).

#### Fee factor

Fee factor is identical to fee growth inside.

#### Threshold price

Threshold price is identical to sqrt price limit. The difference in naming is for clarity and to avoid reusing the term 'limit', which has a different meaning in Haiko.

## 2. Contract architecture

Haiko abandons the factory pattern in favour of a single `MarketManager` contract. In this respect, it is more similar to Uniswap V4. Managing all interactions through a single contract offers gas optimisations and a simpler architecture.

The `MarketManager` contract contains the bulk of the business logic. It is the main entrypoint for:

1. Creating new markets
2. Adding and removing liquidity to new or existing positions
3. Swapping assets through one or multiple markets
4. Placing and collecting limit orders
5. Other miscellaneous actions such as flash loans, sweeping etc

Each market created through `MarketManager` has the option of being deployed with an associated `Strategy`, which defines logic for LPing within that market. More information on this can be found in the [Strategies](#5-strategies) section below.

The current `amm` repo is a monorepo containing both the core AMM logic (under `/amm`) as well as a library of reusable strategies (under `/strategies`). This helps with code reuse, as most of the strategies import libraries from the core protocol.

## 3. Market types

Haiko offers Flexible Liquidity Schemas, allowing markets to be deployed as V2 pools, V3 pools, or start as one and upgrade to the other over time.

Three market types are available:

1. Linear Markets: similar to Uniswap V2 pools where liquidity positions are placed across the entire virtual price range.
2. Concentrated Markets: similar to Uniswap V3 pools, allowing for concentrated liquidity.
3. Hybrid Markets: start out as Linear Markets but are upgradeable to Concentrated Markets.

In practice, Linear and Concentrated Markets are identical except the former enforces the condition that all positions are placed across the entire price range of the pool.

Upgrading to a Concentrated Market is achieved by removing this requirement.

## 4. Limit orders

Haiko supports limit orders, which are implemented as abstractions over regular liquidity positions by automatically removing liquidity once the position is filled.

In Uniswap V4, limit orders are proposed to be implemented as hooks, whereas in Haiko they are integrated into the core protocol itself. This allows strategies to easily place limit orders without having to worry about their underlying implementation.

Limit orders use a batching mechanism for efficient filling, as follows:

1. All limit orders placed at the same limit are allocated to a `batch`, which can be thought of as a pool of assets at that limit.
2. Each `batch` keeps track of a total amount of `liquidity`, as well as total base and quote token balances.
3. As the market price moves, the batch's base and quote balances are updated accordingly.
4. Limit orders are claimed by withdrawing the owner's pro rata share of the batch's base and quote balances.
5. Once a `batch` is fully filled, a `nonce` counter increments to start a new batch at that limit. This allows proper accounting of filled amounts as price moves back and forth over the limit.
6. Depositing to partially filled batches is disallowed, both to prevent unnecessary complexity and to prevent limit orders being placed at the current active limit.

## 5. Strategies

As explained above, each market created through `MarketManager` has the option of being deployed with an associated `Strategy`, which defines logic for market making within that pool.

Specifically, any time a swap is executed, a designated `updatePositions()` function is called, which updates the strategy's positions. Positions are updated prior to swap execution, in a similar way to Uniswap V4's `beforeSwap()` hook.

Note that strategies are not trading strategies, but rather market making strategies. They help LPs automatically manage liquidity positions without the overhead of active management.

Strategies are designed to be as generic as possible, implementing a minimal `IStrategy` interface, and can be used across multiple markets. They are also designed to be easily extensible, allowing developers to modify and create their own custom strategies.

## 6. Limits vs Ticks

> Note: this section deals with lower level implementation details.

Limits are implemented as ticks, but with a lower minimum width of `0.00001 (1e-5)` instead of `0.0001 (1e-4)`.

The current range of valid limits is `[-7906625, 7906625]` rather than `[-887272, 887272]`. This gives a total of `15,813,251 (251 ** 3)` valid limits, which are stored in a three-level tree structure, each comprising a `u32` bitmap of nested `251` segments (fitting into a single `felt252` slot).

Storing limits in a tree structure allows efficient traversal when searching for the next initialised limit. The tree can be expanded to four levels to allow for even greater precision of prices if needed.

## 7. Data types

> Note: this section deals with lower level implementation details.

Haiko uses `X28` fixed point numbers (28 decimals) stored inside a `u256` to handle decimal numbers, including:

- Sqrt prices
- Base and quote fee factors

Token amounts, as well as liquidity units, are represented as unscaled integers corresponding to the token's decimals as per their ERC20 specification (standardised at `18` for Starknet).

In Uniswap V3, all prices are represented as `u160` fixed point numbers, with 96 bits for the integer part and 64 bits for the fractional part. The 28 decimals used by Haiko roughly corresponds to comparable 93 bits of precision.
