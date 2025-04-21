import { file } from "bun";
import { Configuration } from "../env";
import { connect, doTransaction } from "../utils";
import { CallData } from "starknet";
import { prompt } from "prompts";

export async function worldOwner(config: Configuration, args: string[]) {
  const subcommand = args[0];

  switch (subcommand) {
    case "grant":
      await grantWorldOwner(config, args.slice(1));
      break;
    case "revoke":
      await revokeWorldOwner(config, args.slice(1));
      break;
    default:
      console.error(
        `Unknown subcommand: ${subcommand}! Available commands: grant, revoke`,
      );
      break;
  }
}

async function getWorldAddress(config: Configuration) {
  const manifest = await file(
    `${config.basePath}/../contracts/manifest_${config.environment}.json`,
  ).json();

  return manifest.world.address;
}

async function grantWorldOwner(config: Configuration, args: string[]) {
  const address = args[0];

  if (!address) {
    console.error("Address is required!");
    return;
  }

  // Get the world for the environment from the manifest

  const world = await getWorldAddress(config);

  console.log("Waaaaait");

  const response = await prompt({
    type: "confirm",
    name: "value",
    message: `Grant owner to ${address} on world ${world}?`,
    initial: false,
  });

  if (response.value == false) {
    console.log("Operation cancelled");
    return;
  }

  await connect(config);

  await doTransaction({
    contractAddress: world,
    entrypoint: "grant_owner",
    calldata: CallData.compile({
      resource: "0x0",
      address: address,
    }),
  });
}
async function revokeWorldOwner(config: Configuration, args: string[]) {
  const address = args[0];

  if (!address) {
    console.error("Address is required!");
    return;
  }

  await connect(config);

  const world = await getWorldAddress(config);

  const response = await prompt({
    type: "confirm",
    name: "value",
    message: `Revoke owner from ${address} on world ${world}?`,
    initial: false,
  });

  if (response.value == false) {
    console.log("Operation cancelled");
    return;
  }

  await connect(config);

  await doTransaction({
    contractAddress: world,
    entrypoint: "revoke_owner",
    calldata: CallData.compile({
      resource: "0x0",
      address: address,
    }),
  });
}
