ok
<p align="center">
  <img src="https://play.ponzi.land/banner.jpg" alt="PonziLand Logo">
</p>

<p align="center">
  <strong>Fully Onchain, Token-Agnostic DeFi Metagame on Starknet</strong>
</p>

<p align="center">
  <a href="https://docs.ponzi.land"><img src="https://img.shields.io/badge/docs-ponzi.land-blue?style=flat-square" alt="Documentation"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://www.cairo-lang.org/"><img src="https://img.shields.io/badge/Cairo-grey.svg?logo=data:image/svg%2bxml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz48c3ZnIGlkPSJTdGFya05ldF9sb2dvIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MDAgNTAwIj48ZGVmcz48c3R5bGU+LmNscy0xe2ZpbGw6I2ZlNGEzYzt9PC9zdHlsZT48L2RlZnM+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMjUwLDQuNUMxMTQuMiw0LjUsMy45NywxMTQuNzQsMy45NywyNTAuNTNjMCw1Ny41MSwyMC4yNCwxMTAuNzcsNTMuMjUsMTUyLjg0LDI2LjYzLTM3LjgxLDU1LjM4LTczLjQ5LDkxLjYtMTAyLjc4LDEuMDctMS4wNywzLjczLTIuNjYsNi45Mi00Ljc5LDE0LjkxLTExLjE4LDI1LjU2LTI3LjY5LDI4LjIyLTQ2LjMzdi0uNTNjOS4wNS02MC4xOCwzMy41NS04MC45NSwxMDIuMjUtODAuOTUsNS44NiwwLDEyLjc4LDAsMTkuMTcsLjUzLDM1LjE1LDEuNiw1NS4zOCwxMS43Miw1Ny41MSwxNy4wNCwxLjYsMi42NiwxLjA3LDUuODYsLjUzLDkuMDVsLTIuNjYtLjUzYy0yMS44My0yLjY2LTU0Ljg1LDMuNzMtNTkuNjQsMjcuNjktMi42NiwxMy4zMSwuNTMsMjguMjIsMS42LDQxLjU0LDEuNiwxMy44NSwyLjY2LDI4LjIyLDIuNjYsNDIuMDcsMCwxLjA3LTEuMDcsNi4zOSwwLDYuOTItMzcuMjgtMzUuNjgtMTIzLjU1LDkuMDUtMTUwLjcxLDI4Ljc2LDIuNjYtMS4wNyw1LjMzLTIuMTMsOC41Mi0zLjIsMjYuMDktOS4wNSwxMDQuMzgtMzIuNDgsMTM0LjczLTYuMzksMjUuNTYsMzEuNDIsMi42Niw4OS40Ny0xNi41MSwxMTguMjItMTEuMTgsMTcuMDQtMjUuMDMsMzIuNDgtNDAuNDcsNDUuOGg5LjA1YzEzNS44LDAsMjQ2LjAzLTExMC4yNCwyNDYuMDMtMjQ2LjAzUzM4Ni4zMyw0LjUsMjUwLDQuNVptMjguMjIsMTMzLjEzYy0yNi42MywwLTQ4LjQ2LTIxLjgzLTQ4LjQ2LTQ4LjQ2czIxLjgzLTQ4LjQ2LDQ4LjQ2LTQ4LjQ2LDQ4LjQ2LDIxLjgzLDQ4LjQ2LDQ4LjQ2LTIxLjMsNDguNDYtNDguNDYsNDguNDZaIi8+PC9zdmc+" alt="CairoLang"></a>
  <a href="https://github.com/RuneLabsxyz/PonziLand/stargazers"><img src="https://img.shields.io/github/stars/RuneLabsxyz/PonziLand?style=flat-square" alt="GitHub stars"></a>
  <a href="https://x.com/ponzidotland"><img src="https://img.shields.io/twitter/follow/ponzidotland?style=flat-square&logo=twitter" alt="Twitter Follow"></a>
  <a href="https://discord.gg/ponziland"><img src="https://img.shields.io/discord/1201234567890123456?style=flat-square&logo=discord" alt="Discord"></a>
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="https://docs.ponzi.land">Game Docs</a> •
  <a href="GAMEJAM.md">Widget System</a> •
  <a href="ARCHITECTURE.md">Architecture</a> •
</p>

# PonziLand

**PonziLand** is a fully onchain, token-agnostic DeFi metagame where you conquer lands, stake tokens, nuke rivals, and build your empire on Starknet. Every land is a battleground of strategy, risk, and reward—will you become a PonziLord or get rugged by your neighbors?

---

## 🚀 Quick Start

Clone the repo and run the client locally with the mainnet contract:

```bash
git clone git@github.com:RuneLabsxyz/PonziLand.git
cd PonziLand/client
bun install
bun dev:mainnet
```

Open your browser at [https://localhost:3000](https://localhost:3000) to start playing.

---

## 🕹️ What is PonziLand?

PonziLand is a blockchain-based game where players can own, trade, and earn from virtual land plots. Each plot can be purchased using different tokens and generates taxes from neighboring lands. Players must maintain sufficient stake to avoid having their land "nuked" (forcefully removed). The game is designed to be fully token-agnostic, allowing for a wide range of DeFi strategies and social gameplay.

**Core Gameplay:**

- **Conquer:** Acquire land through Dutch auctions or by buying from other players.
- **Stake:** Lock tokens as security to protect your land from being nuked.
- **Earn:** Collect taxes from your neighbors and claim rewards.
- **Nuke:** If your neighbors don't keep up, nuke their lands and expand your empire.
- **Upgrade:** Level up your land and maximize your earnings.

PonziLand is a game of strategy, timing, and social maneuvering—where every day is a new scheme.

---

## 🏗️ Project Structure

- `client/` – SvelteKit front-end, including the modular widget system for UI extensions.
- `contracts/` – Cairo smart contracts for the PonziLand game logic.
- `crates/` – Rust backend and models, including the meta-indexer for Starknet data.
- `playtest/` – Scripts and tools for playtesting and analytics.

See [GAMEJAM.md](GAMEJAM.md) for a detailed guide on extending the UI with custom widgets.

---

## 🧩 Widget System

PonziLand's UI is built around a flexible widget system. You can add new widgets to the game interface without touching core logic. See the [Widget System Overview](GAMEJAM.md#widget-system-overview) for details and examples.

---

## ⚙️ Architecture

- **Onchain:** All land, auctions, and core actions are managed by Cairo smart contracts on Starknet.
- **Meta-Indexer:** A Rust-based service ingests and enriches blockchain data for fast, replay-safe queries.

See [ARCHITECTURE.md](ARCHITECTURE.md) for more technical details.

---

## 🏦 Core Actions

- **Auction:** Bid on new land plots in Dutch auctions.
- **Buy:** Purchase land from other players.
- **Claim:** Collect taxes from your neighbors.
- **Increase Price/Stake:** Adjust your land's price or stake to optimize strategy.
- **Level Up:** Upgrade your land for greater rewards.

For a full list of smart contract actions and view functions, see [contracts/DEVELOPMENT.md](contracts/DEVELOPMENT.md).

---

## 🛠️ Contributing

- Fork and clone the repo.
- See [GAMEJAM.md](GAMEJAM.md) for widget and UI modding.
- Join the [Discord](https://discord.gg/ponziland) for support and collaboration.

---

## 📣 Community & Links

- **Website:** [ponzi.land](https://www.ponzi.land)
- **Play:** [play.ponzi.land](https://play.ponzi.land)
- **Docs:** [docs.ponzi.land](https://docs.ponzi.land)
- **Twitter:** [@ponzidotland](https://x.com/ponzidotland)
- **Discord:** [discord.gg/ponziland](https://discord.gg/ponziland)
- **RuneLabs:** [runelabs.xyz](https://www.runelabs.xyz) | [@runelabsxyz](https://x.com/runelabsxyz)

---

## 📄 License

PonziLand is released under the MIT License. See [LICENSE](LICENSE) for details.

---

**Stake your claim, become a PonziLord! Upgrade or get rugged—the choice is yours.**
