import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { $, env, file } from "bun";
import {
  Account,
  LedgerSigner,
  LedgerSigner221,
  Provider,
  constants,
  getLedgerPathBuffer221,
} from "starknet";

import { prompt } from "prompts";

async function getAddressFromAccountFile(ledger: boolean = false) {
  const variable = ledger
    ? env.STARKNET_LEDGER_ACCOUNT!
    : env.STARKNET_ACCOUNT!;

  const contents = await file(variable.replace("~", env.HOME!)).json();
  const address = contents.deployment.address;

  console.log("Address:", address, variable);

  return address;
}

export async function getLedgerAccount(provider: Provider): Promise<Account> {
  prompt("Connect your ledger, enter your PIN and click enter to continue...");
  const myLedgerTransport = await TransportNodeHid.create();
  const myLedgerSigner = new LedgerSigner221(myLedgerTransport, 0, "argentx");

  // Proxy the signer
  const myLedgerSignerProxy = new Proxy(myLedgerSigner, {
    get(target, prop, receiver) {
      console.log("proxy catch!", prop);

      return Reflect.get(target, prop, receiver);
    },
  });

  return new Account(
    provider,
    await getAddressFromAccountFile(true),
    myLedgerSignerProxy,
    undefined,
    constants.TRANSACTION_VERSION.V3,
  );
}

export async function getStarkliAccount(provider: Provider): Promise<Account> {
  // Set environment
  // Ask for $STARKNET_KEYSTORE_PASSWORD
  if (!env.STARKNET_KEYSTORE_PASSWORD) {
    env.STARKNET_KEYSTORE_PASSWORD = (
      await prompt({
        type: "password",
        name: "value",
        message: "Enter your Starknet keystore password:",
      })
    ).value;
  }
  const { stdout } =
    await $`starkli signer keystore inspect-private $STARKNET_KEYSTORE --password $STARKNET_KEYSTORE_PASSWORD --raw`
      .env({
        STARKNET_KEYSTORE_PASSWORD: env.STARKNET_KEYSTORE_PASSWORD!,
        STARKNET_KEYSTORE: env.STARKNET_KEYSTORE!,
      })
      .quiet();
  const privateKey = stdout.toString().replace("\n", "");

  // Return the resulting account
  return new Account(
    provider,
    await getAddressFromAccountFile(),
    privateKey,
    undefined,
    constants.TRANSACTION_VERSION.V3,
  );
}
