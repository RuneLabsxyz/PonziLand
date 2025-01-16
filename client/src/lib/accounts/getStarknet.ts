import type { AccountProvider, StoredSession } from "$lib/contexts/account";
import { dojoConfig } from "$lib/dojoConfig";
import { getStarknet } from "@starknet-io/get-starknet-core";
import { WALLET_API } from "@starknet-io/types-js";
import {
  WalletAccount,
  wallet,
  validateAndParseAddress,
  constants as SNconstants,
  Account,
} from "starknet";

export abstract class CommonStarknetWallet implements AccountProvider {
  protected _wallet?: WalletAccount;
  protected _session?: Account;
  protected _walletObject: WALLET_API.StarknetWindowObject;

  constructor(walletObject: WALLET_API.StarknetWindowObject) {
    this._walletObject = walletObject;
  }

  abstract supportsSession(): boolean;
  abstract getAccount(): Account | undefined;
  abstract setupSession(): Promise<StoredSession>;

  async connect() {
    // Create the wallet object
    this._wallet = new WalletAccount(
      {
        nodeUrl: dojoConfig.rpcUrl,
        // We won't be using argent / braavos on slot deployments any time soon
        chainId:
          dojoConfig.profile == "mainnet"
            ? SNconstants.StarknetChainId.SN_MAIN
            : SNconstants.StarknetChainId.SN_SEPOLIA,
      },
      this._walletObject
    );

    // This is where we need to catch errors if the user cancelled
    const result = await this._wallet.requestAccounts();

    if (typeof result == "string") {
      // This is extracted from the example https://github.com/PhilippeR26/Starknet-WalletAccount/blob/main/src/app/components/client/WalletHandle/SelectWallet.tsx
      // not sure why this means that the wallet is not compatible, but welp
      throw "This wallet is incompatible";
    }

    const isConnectedWallet: boolean = await this._wallet
      .getPermissions()
      .then((res) => res.length > 0);

    if (!isConnectedWallet) {
      this._wallet = undefined;
      throw "The wallet was not connected correctly";
    }
  }

  async disconnect() {
    getStarknet({
      windowObject: this._walletObject,
    }).disconnect();
    this._wallet = undefined;
    this._session = undefined;
  }

  async loadSession(storage: StoredSession): Promise<any> {
    this._session = new Account(
      this._wallet!,
      storage.address,
      storage.privateKey
    );
  }

  getWalletAccount() {
    return this._wallet;
  }
}
