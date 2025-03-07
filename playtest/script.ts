import { $, env, file } from "bun";
import tokens from "./tokens.json";
import {
  Account,
  CairoCustomEnum,
  Contract,
  RpcProvider,
  constants,
  transaction,
} from "starknet";
import { ABI } from "./abi";

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

async function setAccess(token_address: string) {
  const contract = new Contract(ABI, token_address, account).typedv2(ABI);

  const tx = await contract.set_access(
    "0x02d9ec36cd62c36e2b3cb2256cd07af0e5518e9e462a8091d73b0ba045fc1446",
    new CairoCustomEnum({ Minter: {} }),
  );

  await provider.waitForTransaction(tx.transaction_hash);

  console.log(`Transaction ${tx.transaction_hash} passed!`);
}

for (const token of tokens.tokens) {
  console.log("Adding ourselves as a validator");

  await setAccess(token.address);
}
