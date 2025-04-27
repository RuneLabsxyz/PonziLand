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
