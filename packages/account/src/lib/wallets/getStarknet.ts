import type {
  AccountProvider,
  StoredSession,
} from '../context/account.svelte.js';
import { accountConfig } from '../consts.js';
import getStarknet from "@starknet-io/get-starknet-core"
import { WALLET_API } from '@starknet-io/types-js';
import {
  WalletAccount,
  wallet,
  validateAndParseAddress,
  constants as SNconstants,
  Account,
  Provider,
  CallData,
  type Call,
  selector,
  AccountInterface,
} from 'starknet';

export abstract class CommonStarknetWallet implements AccountProvider {
  protected _wallet?: WalletAccount;
  protected _session?: Account;
  protected _walletObject: WALLET_API.StarknetWindowObject;

  constructor(walletObject: WALLET_API.StarknetWindowObject) {
    this._walletObject = walletObject;
  }

  abstract supportsSession(): boolean;
  abstract getAccount(): Account | undefined;
  abstract setupSession(): Promise<StoredSession | void>;

  async connect() {
    this._wallet = await WalletAccount.connect(
      new Provider({
        nodeUrl: accountConfig.rpcUrl,
        // We won't be using argent / braavos on slot deployments any time soon
        chainId:
          accountConfig.chainId == 'mainnet'
            ? SNconstants.StarknetChainId.SN_MAIN
            : SNconstants.StarknetChainId.SN_SEPOLIA,
      }),
      this._walletObject,
    );

    // This is where we need to catch errors if the user cancelled
    const result = await this._wallet.requestAccounts(true);

    if (typeof result == 'string') {
      // This is extracted from the example https://github.com/PhilippeR26/Starknet-WalletAccount/blob/main/src/app/components/client/WalletHandle/SelectWallet.tsx
      // not sure why this means that the wallet is not compatible, but welp
      throw 'This wallet is incompatible';
    }

    const isConnectedWallet: boolean = await this._wallet
      .getPermissions()
      .then((res) => res.length > 0);

    if (!isConnectedWallet) {
      this._wallet = undefined;
      throw 'The wallet was not connected correctly';
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
      storage.privateKey,
    );
  }

  getWalletAccount() {
    if (this._wallet != undefined) {
      return this._wallet;
    } else {
      return undefined;
    }
  }

  get icon(): string {
    const icon = this._walletObject!.icon;
    if (typeof icon === 'string') {
      return icon;
    } else {
      return icon.dark;
    }
  }
}

export class NoSessionStarknetWallet extends CommonStarknetWallet {
  supportsSession(): boolean {
    return false;
  }
  getAccount(): WalletAccount | undefined {
    return this._wallet;
  }
  async setupSession(): Promise<StoredSession | void> {
    // no-op
  }
}
