import { prompt } from "prompts";
import { connect, doTransaction, getContractAddress } from "../utils";
import { Configuration } from "../env";
import { cairo } from "starknet";
export async function whitelist(config: Configuration, args: string[]) {
  let [address] = args;

  if (address === undefined) {
    const values = await prompt([
      {
        type: "text",
        name: "address",
        message: "Address to whitelist",
      },
    ]);
    if (values.address == undefined) {
      console.log("Address is required");
      return;
    }

    address = values.address;
  }

  await connect(config);

  // Get the address of the auth contract
  const authAddress = await getContractAddress("auth");

  await doTransaction({
    contractAddress: authAddress,
    entrypoint: "add_authorized",
    calldata: [address],
  });
}
