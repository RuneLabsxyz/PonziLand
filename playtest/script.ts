#!/usr/bin/env bun

import { parseArgs } from "util";
import { exit } from "process";
import dotenv from "dotenv";

import { testTransaction } from "./scripts/commands/test";
import { Configuration } from "./scripts/env";
import { deployToken } from "./scripts/commands/deploy_tokens";
import { file } from "bun";
import path from "path";
import { mint } from "./scripts/commands/mint";
import { setupPool } from "./scripts/commands/setup_pool";
import { worldOwner } from "./scripts/commands/dojo_owner";
import { whitelist } from "./scripts/commands/whitelist";
import { ensurePermissions } from "./scripts/commands/ensure_permissions";
import { upgradeTokens } from "./scripts/commands/upgrade_tokens";
import { pauseGame } from "./scripts/commands/pause";
import { registerTokens } from "./scripts/commands/whitelist_tokens";
import { reset } from "./scripts/commands/reset";
import { updateConfig } from "./scripts/commands/update_conf";

const SOCIALINK_SIGNER_ADDRESS =
  "0x008ea9029cec9c339e0513a17336e9af43278ebd81858aee0af110c3e810fce6";
const SOCIALINK_GRANTER_ADDRESS =
  "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446";

const { values, positionals } = parseArgs({
  args: Bun.argv,
  options: {
    rpc: {
      type: "string",
      description: "RPC URL to use",
    },
    env: {
      type: "string",
      default: "sepolia",
      description: "Environment to run the action in",
    },
    owner: {
      type: "string",
      description: "The owner address of the resulting contract(s)",
    },
    ledger: {
      type: "boolean",
      default: false,
      description: "Force the use of ledger",
    },
    name: {
      type: "string",
      description: "The name of the deployment",
    },
  },
  strict: true,
  allowPositionals: true,
});

const basePath = path.dirname(import.meta.path);

console.log(`Loading environment for '${values.env}'`);
// Load the environment
const { parsed: env } = dotenv.config({
  path: `${basePath}/.env.${values.env}`,
});

const config: Configuration = {
  environment: values.env,
  rpc: values.rpc || env!.STARKNET_RPC,
  basePath,
  owner: values.owner || env!.OWNER,
  forceLedger: values.ledger,
  deploymentName: values.name!,
};

let command = positionals[2];
let commandPositionals = positionals.slice(3);

switch (command) {
  case "deploy":
    // Deploy contract
    await deployToken(config, commandPositionals);
    break;
  case "test":
    // Send test transaction
    await testTransaction(config);
    break;
  case "mint":
    await mint(config, commandPositionals);
    break;
  case "setup-pool":
    await setupPool(config, commandPositionals);
    break;
  case "owner":
    await worldOwner(config, commandPositionals);
    break;
  case "whitelist":
    await whitelist(config, commandPositionals);
    break;
  case "ensure-permissions":
    await ensurePermissions(config, commandPositionals);
    break;
  case "upgrade-tokens":
    await upgradeTokens(config, commandPositionals);
    break;
  case "pause":
    await pauseGame(config, commandPositionals);
    break;
  case "register-tokens":
    await registerTokens(config, commandPositionals);
    break;
  case "update-conf":
    await updateConfig(config, commandPositionals);
    break;
  case "reset":
    await reset(config, commandPositionals);
    break;
  case undefined:
    console.log("No command provided!");
    break;
  default:
    console.log("Unknown command!");
}

exit(0);
/*
await doTransaction({
  contractAddress:
    "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446",
  entrypoint: "set_mint_status",
  calldata: CallData.compile({
    address: "0x1",
    status: new CairoOption<CairoCustomEnum>(
      CairoOptionVariant.Some,
      new CairoCustomEnum({
        ePAL: {},
      }),
    ),
  }),
});
 */

// After the build process, generate torii-katana.toml
console.log("📝 Generating torii-katana.toml...");

// Read world address from manifest_dev.json
const worldAddress = Bun.file("PonziLand/contracts/manifest_dev.json").json().world.address;

// Generate the torii-katana.toml file
const toriiKatanaToml = Bun.file("PonziLand/contracts/torii-katana.toml");
toriiKatanaToml.write(`world_address = "${worldAddress}"
rpc = "https://api.cartridge.gg/x/starknet/sepolia"
explorer = false

[events]
raw = true

[sql]
historical = [
    "ponzi_land-AddressAuthorizedEvent",
    "ponzi_land-AddressRemovedEvent",

    "ponzi_land-AuctionFinishedEvent",
    "ponzi_land-LandBoughtEvent",
    "ponzi_land-LandNukedEvent",

    "ponzi_land-NewAuctionEvent",
    "ponzi_land-RemainingStakeEvent",

    "ponzi_land-VerifierUpdatedEvent",

    "ponzi_land-Land",
    "ponzi_land-LandStake",
]


[indexing]
contracts = [
`);

// Add token contracts from tokens.katana.json
Bun.file("PonziLand/playtest/tokens.katana.json").json().tokens.forEach(token => {
  toriiKatanaToml.write(`    "erc20:${token.address}", # ${token.symbol}\n`);
});

// Close the contracts array
toriiKatanaToml.write(`]
`);

console.log(`✅ Generated torii-katana.toml with world address: ${worldAddress}`);
