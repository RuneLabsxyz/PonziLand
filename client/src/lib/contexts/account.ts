// Get the wanted system from the environment

import { dojoConfig, type DojoConfig } from '$lib/dojoConfig';
import type { AccountInterface } from 'starknet';
import { PUBLIC_DOJO_BURNER_ADDRESS } from '$env/static/public';
import { setupBurnerAccount, useBurnerAccount } from '$lib/accounts/burner';
import { WALLET_API } from '@starknet-io/types-js';
import getStarknet from '@starknet-io/get-starknet-core';
import { isWalletObject } from '@starknet-io/get-starknet-core';
import { setupController, SvelteController } from '$lib/accounts/controller';
import { browser } from '$app/environment';
import { getContext, setContext } from 'svelte';
import type { Store } from './store';
import { ArgentXAccount } from '$lib/accounts/argentx';
import { list } from 'postcss';

/// Common functions required to be implemented by all account providers;

export const USE_BURNER = PUBLIC_DOJO_BURNER_ADDRESS != 'null';

// TODO: In AccountProvider, offer a way to store the session loaded from local storage, if it exists (can be a no-op on cartridge + burner)

export type AccountProvider = {
  connect(): Promise<any>;

  setupSession(): Promise<StoredSession | void>;
  loadSession(storage: StoredSession): Promise<void>;

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

const stubLocalStorage = {
  getItem(id: string) {
    return null;
  },
  setItem(id: string, value: string) {},
  removeItem(id: string) {},
};

const localStorage = browser ? window.localStorage : stubLocalStorage;

// TODO:
// Store in a sesion the last used wallet.
// On setup, find all available wallets, and create an instance of the selected one if it exists.
// If not available, not set the inner AccountProvider.
// Add a function to request login for a specific wallet, that calls the .login() for the selected account (by id)
// Then, delegate the rest to the current account.

const accountManager = Symbol('accountManager');
const previousWalletSymbol = Symbol('previousWallet');
const previousWalletSession = Symbol('walletSession');

let controller: SvelteController | undefined;

export async function Provider(
  wallet: WALLET_API.StarknetWindowObject,
): Promise<AccountProvider | null> {
  switch (wallet.id) {
    case 'burner':
      if (USE_BURNER) {
        return (await setupBurnerAccount(dojoConfig)) ?? null;
      }
      return null;
    case 'controller':
      return controller ?? null;
    case 'argentX':
      return new ArgentXAccount(wallet);
    // NOTE: To add new providers, this is here.
    default:
      console.warn('Unknown provider: ', wallet.id);
      return null;
  }
}

export interface StoredSession {
  address: string;
  privateKey: string;
  expiry: Date;
}

let availableWallets: ValidWallet[] = [];

// export interface StarknetWalletProvider extends StarknetWindowObject {}
type ValidWallet = {
  wallet: WALLET_API.StarknetWindowObject;
  isValid: boolean;
};

async function scanObjectForWalletsCustom(): Promise<void> {
  if (!browser || availableWallets.length > 0) {
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
  private _provider?: AccountProvider;
  private _setup: boolean = false;
  private _setupPromise: Promise<AccountManager>;

  constructor() {
    this._setupPromise = this.setup();
  }

  public async wait(): Promise<AccountManager> {
    return await this._setupPromise;
  }

  private async setup(): Promise<AccountManager> {
    // If it is dev, just use the burner provider
    if (USE_BURNER) {
      this._provider = await setupBurnerAccount(dojoConfig)!;
    }

    const previousWallet: string | null = localStorage.getItem(
      previousWalletSymbol.toString(),
    );

    // Setup cartridge before anything else
    controller = await setupController(dojoConfig);

    // Get all available wallets
    await scanObjectForWalletsCustom();

    if (previousWallet != null) {
      console.info('Attempting auto-login with provider', previousWallet);
      try {
        await this.selectAndLogin(previousWallet);

        this.getSessionFromStorage();
      } catch (e) {
        console.error(
          'An error occurred while auto-logging the provider ',
          previousWallet,
          e,
        );

        this.disconnect();
      }
      return this;
    }

    console.info('The user did not have a previous wallet selected.');

    // NOTE: If session is supported, extract the public & private session from local storage.
    return this;
  }

  public async selectAndLogin(providerId: string) {
    const walletObject = availableWallets.find(
      (e) => e.wallet.id == providerId,
    );
    if (walletObject == null) {
      throw 'Unknown provider!';
    }

    const provider = await Provider(walletObject.wallet);
    if (provider == null) {
      throw 'Could not setup provider (not registered in account.ts)';
    }

    try {
      // Handle user cancelled action
      this._provider = provider;
      // First, ask for a login
      await provider.connect();
      console.info('User logged-in successfully');

      localStorage.setItem(previousWalletSymbol.toString(), providerId);
    } catch {
      console.warn('The user did not log in successfully!');
    }
  }

  public disconnect() {
    // Remove all associated strings from local storage
    localStorage.removeItem(previousWalletSymbol.toString());
    localStorage.removeItem(previousWalletSession.toString());

    if (this._provider) {
      this._provider.disconnect();
    }
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

    const result = await this._provider.setupSession();
    if (result != undefined) {
      localStorage.setItem(
        previousWalletSession.toString(),
        JSON.stringify(result),
      );
    }
  }

  public getAvailableWallets() {
    return availableWallets.map((e) => e.wallet);
  }

  public promptForLogin(): Promise<void> {
    window.dispatchEvent(new Event('wallet_prompt'));

    return new Promise((resolve) => {
      const listener = () => {
        window.removeEventListener('wallet_login_success', listener);
        resolve();
      };
      window.addEventListener('wallet_login_success', listener);
    });
  }

  private getSessionFromStorage() {
    let parsed: StoredSession;
    try {
      const json = localStorage.getItem(previousWalletSession.toString());
      if (json == null) {
        return;
      }
      parsed = JSON.parse(json);
    } catch (e) {
      console.log('Could not fetch session data');
      return;
    }

    if (parsed.expiry < new Date()) {
      console.warn('The session has expired.');
      localStorage.removeItem(previousWalletSession.toString());
    }

    this._provider?.loadSession(parsed);
  }

  // TODO: Maybe mirror the some of the AccountProvider functions to make it easier to use?
}

export function setupAccount(): Promise<AccountManager> {
  if (getContext(accountManager) != null) {
    return getContext(accountManager);
  }
  const manager = new AccountManager();

  setContext(accountManager, manager);

  return manager.wait();
}

export function useAccount() {
  const manager = getContext<AccountManager>(accountManager);
  if (manager == null) {
    console.error(
      'You are using useAccount(), but the setupAccount() function has not been called.',
    );
  }

  return manager;
}
