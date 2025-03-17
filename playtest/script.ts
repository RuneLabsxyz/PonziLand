import { $, env, file } from "bun";
import tokens from "./tokens.json";
import manifest from "../contracts/manifest_sepolia.json";
import holders from "./query-results.json";
import {
  Account,
  CairoCustomEnum,
  Contract,
  RpcProvider,
  constants,
  transaction,
  CairoOption,
  CallData,
  CairoOptionVariant,
  Call,
} from "starknet";
import { ABI } from "./abi";
import { exit } from "node:process";

const provider = new RpcProvider({
  nodeUrl: env.STARKNET_RPC,
});

const { stdout } =
  await $`starkli signer keystore inspect-private $STARKNET_KEYSTORE --password $STARKNET_KEYSTORE_PASSWORD --raw`.quiet();
const privateKey = stdout.toString().replace("\n", "");

const address = (
  await file(env.STARKNET_ACCOUNT!.replace("~", env.HOME!)).json()
).deployment.address;

const account = new Account(
  provider,
  address,
  privateKey,
  undefined,
  constants.TRANSACTION_VERSION.V3,
);

function getCalls(contractAddress: string) {
  const calls: Call[] = [];
  for (const holder of holders) {
    calls.push({
      contractAddress,
      entrypoint: "set_mint_status",
      // approve 1 wei for bridge
      calldata: CallData.compile({
        address: holder.account_address,
        status: new CairoOption<CairoCustomEnum>(
          CairoOptionVariant.Some,
          new CairoCustomEnum({ ePAL: {} }),
        ),
      }),
    });
  }
  return calls;
}

async function resetUser(address: string) {
  console.log("Reseting user.");
  const authContractAddress = manifest.contracts.find(
    (e) => e.tag == "ponzi_land-auth",
  )?.address;

  const txHash = await account.execute([
    // Reset the activation status
    {
      contractAddress: authContractAddress!,
      entrypoint: "remove_authorized",
      calldata: CallData.compile({
        address,
      }),
    },
    // Reset the mint status
    {
      contractAddress:
        "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446",
      entrypoint: "set_mint_status",
      calldata: CallData.compile({
        address,
        status: new CairoOption<CairoCustomEnum>(CairoOptionVariant.None),
      }),
    },
  ]);

  console.log(txHash);

  await provider.waitForTransaction(txHash.transaction_hash);

  console.log(`Transaction ${txHash} passed!`);
}

await resetUser(
  "0x01537422a78edbb830b46007573169e2d0c1b524f6de8f9e7775f3be1be5da5d",
);

exit(0);

async function setAccess(token_address: string) {
  const contract = new Contract(ABI, token_address, account).typedv2(ABI);

  const tx = await contract;

  await provider.waitForTransaction(tx.transaction_hash);

  console.log(`Transaction ${tx.transaction_hash} passed!`);
}

for (const token of tokens.tokens) {
  console.log("Adding ourselves as a validator");

  await setAccess(token.address);
}
