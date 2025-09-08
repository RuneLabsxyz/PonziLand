import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { $, env, file } from "bun";
import {
  Account,
  LedgerSigner,
  LedgerSigner221,
  LedgerSigner231,
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
  const myLedgerSigner = new LedgerSigner231(myLedgerTransport, 0, "argentx");

  // Proxy the signer
  const myLedgerSignerProxy = new Proxy(myLedgerSigner, {
    get(target, prop, receiver) {
      console.log("proxy catch!", prop);

      return Reflect.get(target, prop, receiver);
    },
  });

  return new Account({
    provider,
    address: await getAddressFromAccountFile(true),
    signer: myLedgerSignerProxy,
  });
}

export async function getKatanaAccount(provider: Provider): Promise<Account> {
  return new Account(
    {provider,
    address: "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec",
    signer: "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912",
  });
  ;
}


//Temp, should use keystore 
export async function getSepoliaAccount(provider: Provider): Promise<Account> {
  return new Account({
    provider,
    address: "0x0694182a014b39855a1b139961a3f39e7d4b43527b30d892a630d66a2abe3780",
    signer: "0x0430638cc3ef026ad7a74d9ad143bfc15bf303cea0be1c972ab1f280c90a531a",
  });
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
  return new Account({
    provider,
    address: await getAddressFromAccountFile(),
    signer: privateKey,
  }
  );
}
