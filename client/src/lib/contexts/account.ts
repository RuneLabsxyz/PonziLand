// Get the wanted system from the environment

import type { AccountInterface } from 'starknet';
import { PUBLIC_DOJO_BURNER_ADDRESS } from '$env/static/public';
import { WALLET_API } from '@starknet-io/types-js';
import getStarknet from '@starknet-io/get-starknet-core';
import { browser } from '$app/environment';

/// Common functions required to be implemented by all account providers;

export const USE_BURNER = PUBLIC_DOJO_BURNER_ADDRESS != 'null';

// TODO: In AccountProvider, offer a way to store the session loaded from local storage, if it exists (can be a no-op on cartridge + burner)

export type AccountProvider = {
  connect(): Promise<any>;

  setupSession(): Promise<any>;

  /// Gets the session account, or in the event that the session account is not available, give out the traditionnal
  /// wallet account.
  getAccount(): AccountInterface | undefined;

  /// For traditional wallets (Argent / Braavos), we need to offer a way to execute actions that has not been granted
  /// for the session (in our case, ERC-20 approve functions, because the user can input custom ones).
  /// In the case where it is not needed, returns the base account (for the controller, it will open a popup anyways)
  getWalletAccount(): AccountInterface | undefined;

  /// Returns true if the session is supported for this client
  supportsSession(): boolean;

  disconnect(): Promise<void>;
};

// TODO:
// Store in a sesion the last used wallet.
// On setup, find all available wallets, and create an instance of the selected one if it exists.
// If not available, not set the inner AccountProvider.
// Add a function to request login for a specific wallet, that calls the .login() for the selected account (by id)
// Then, delegate the rest to the current account.

const accountManager = Symbol('accountManager');

let availableWallets = [];

// export interface StarknetWalletProvider extends StarknetWindowObject {}
type ValidWallet = {
  wallet: WALLET_API.StarknetWindowObject;
  isValid: boolean;
};

async function scanObjectForWalletsCustom(): Promise<void> {
  if (!browser) {
    return;
  }

  const wallets = await getStarknet.getAvailableWallets({});
  console.log('List of starknet wallets', wallets);
  availableWallets = await Promise.all(
    wallets.map(async (wallet: WALLET_API.StarknetWindowObject) => {
      let isValid = await checkCompatibility(wallet);
      // If not valid still check maybe its a virtual wallet ?
      if (!isValid) {
        try {
          wallet = await (wallet as any).loadWallet(window);
        } catch (e) {
          console.log('Not a virtual wallet', e);
        }
        isValid = await checkCompatibility(wallet);
      }
      return { wallet: wallet, isValid: isValid } as ValidWallet;
    }),
  );
  console.log(availableWallets);
}
const checkCompatibility = async (
  myWalletSWO: WALLET_API.StarknetWindowObject,
) => {
  let isCompatible: boolean = false;
  try {
    const permissions = (await myWalletSWO.request({
      type: 'wallet_getPermissions',
    })) as string[];
    isCompatible = true;
  } catch {
    (err: any) => {
      console.log('Wallet compatibility failed.\n', err);
    };
  }
  return isCompatible;
};

export class AccountManager {
  _provider?: AccountProvider;
  _previousWalletId?: string;

  constructor() {}

  public async setup(): Promise<AccountManager> {
    // TODO: Get the previous wallet id from the local storage.
    // If it is not null, get & probe the wallet to set it up.
    // If an error occurs, simply not set the provider so that the session selection screen can show up.

    // NOTE: If session is supported, extract the public & private session from local storage.

    return this;
  }

  public async selectAndLogin(provider: string) {
    // TODO: Set in the _provider variable the AccountProvider of the selected wallet (use a map)
    // And then call the login() function to prompt everything.
    // Also store the ID to local storage
  }

  public getProvider() {
    return this._provider;
  }

  public async setupSession() {
    if (this._provider == null) {
      throw 'No provider is setup!';
    }

    if (!this._provider.supportsSession()) {
      throw 'The provider does not support session setup!';
    }

    // TODO: Call the setupSession from the provider.
    // If everything worked, store the session credentials in local storage.
  }

  // TODO: Maybe mirror the some of the AccountProvider functions to make it easier to use?
}
