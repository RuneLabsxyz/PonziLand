// Get the wanted system from the environment

import { browser } from '$app/environment';
import {
  PUBLIC_DOJO_BURNER_ADDRESS,
  PUBLIC_DOJO_CHAIN_ID,
} from '$env/static/public';
import { ArgentXAccount } from '$lib/accounts/argentx';
import { setupBurnerAccount } from '$lib/accounts/burner';
import { setupController, SvelteController } from '$lib/accounts/controller';
import { NoSessionStarknetWallet } from '$lib/accounts/getStarknet';
import { dojoConfig } from '$lib/dojoConfig';
import getStarknet from '@starknet-io/get-starknet-core';
import { WALLET_API } from '@starknet-io/types-js';
import {
  Account,
  cairo,
  WalletAccount,
  type AccountInterface,
  shortString,
  constants,
} from 'starknet';
import { getContext, setContext } from 'svelte';

/// Common functions required to be implemented by all account providers;

export const USE_BURNER = PUBLIC_DOJO_BURNER_ADDRESS != 'null';

// TODO: In AccountProvider, offer a way to store the session loaded from local storage, if it exists (can be a no-op on cartridge + burner)

export type AccountProvider = {
  connect(): Promise<any>;

  setupSession(): Promise<StoredSession | void>;
  loadSession(storage: StoredSession): Promise<void>;

  icon: string;

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

export type ConnectedEvent = {
  type: 'connected';
  provider: AccountProvider;
};

export type DisconnectedEvent = {
  type: 'disconnected';
};

export type ChainChangedEvent = {
  type: 'chain_change';
  chainId: string;
};

export type Event = ConnectedEvent | DisconnectedEvent | ChainChangedEvent;

export type EventListener = (event: Event) => void;

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
      return new NoSessionStarknetWallet(wallet);
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
  private _walletObject?: WALLET_API.StarknetWindowObject;
  private _setup: boolean = false;
  private _setupPromise: Promise<AccountManager>;
  private _listeners: EventListener[] = [];

  constructor() {
    this._setupPromise = this.setup();
  }

  public listen(listener: EventListener): () => void {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.findIndex((e) => e == listener);
      if (index != -1) {
        this._listeners.splice(index, 1);
      }
    };
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
      this._walletObject = walletObject.wallet;
      // First, ask for a login
      await provider.connect();
      console.info('User logged-in successfully');

      this._listeners.forEach((listener) =>
        listener({
          type: 'connected',
          provider,
        }),
      );

      const walletAccount = provider.getWalletAccount();
      if (walletAccount instanceof WalletAccount) {
        console.log('Wallet account!');
        walletAccount.onNetworkChanged(this.onNetworkChanged.bind(this));
        walletAccount.onAccountChange(this.onWalletChanged.bind(this));
      }

      localStorage.setItem(previousWalletSymbol.toString(), providerId);
    } catch (error) {
      console.warn('The user did not log in successfully!', error);
    }
  }

  public async switchChain(chainId: string) {
    const walletAccount = this._provider?.getWalletAccount();
    if (walletAccount instanceof WalletAccount) {
      await walletAccount.switchStarknetChain(
        shortString.encodeShortString(chainId) as constants.StarknetChainId,
      );
    } else {
      console.error('The switch chain operation is not supported!');
    }
  }

  public getProviderName() {
    return this._walletObject?.id;
  }

  public async getChainId() {
    console.log(this._walletObject);
    const chainId = await this._walletObject?.request({
      type: 'wallet_requestChainId',
    });
    console.log('Response:', chainId);
    console.log('chainId:', shortString.decodeShortString(chainId ?? '0x0'));
    return shortString.decodeShortString(chainId ?? '0x0');
  }

  public disconnect() {
    // Remove all associated strings from local storage
    localStorage.removeItem(previousWalletSymbol.toString());
    localStorage.removeItem(previousWalletSession.toString());

    if (this._provider) {
      this._provider.disconnect();

      this._walletObject?.off(
        'networkChanged',
        this.onNetworkChanged.bind(this),
      );
      this._walletObject?.off(
        'accountsChanged',
        this.onWalletChanged.bind(this),
      );

      // Announce that you are disconnected.
      this._listeners.forEach((listener) =>
        listener({
          type: 'disconnected',
        }),
      );

      this._provider = undefined;
      this._walletObject = undefined;
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

  private onWalletChanged(accounts?: string[]) {
    console.log('This:', this);
    if (accounts?.length ?? 0 == 0) {
      this.disconnect();
      return;
    }

    this._listeners.forEach((listener) => {
      listener({
        type: 'connected',
        provider: this._provider!,
      });
    });
  }

  private onNetworkChanged(chainId?: string, accounts?: string[]) {
    // Notify that the network has changed
    this._listeners.forEach((listener) => {
      listener({
        type: 'chain_change',
        chainId: shortString.decodeShortString(chainId ?? '0x0') ?? 'unknown',
      });
    });
  }

  // TODO: Maybe mirror the some of the AccountProvider functions to make it easier to use?
}

let state = $state<AccountManager | null>(null);

export function setupAccount(): Promise<AccountManager> {
  if (state != null) {
    return state.wait();
  }

  const manager = new AccountManager();

  state = manager;

  return manager.wait();
}

export function useAccount() {
  const manager = state;
  if (manager == null) {
    console.error(
      'You are using useAccount(), but the setupAccount() function has not been called.',
    );
  }

  return manager;
}
