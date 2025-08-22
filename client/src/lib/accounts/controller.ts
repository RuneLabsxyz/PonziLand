import type {
  AccountProvider,
  StoredSession,
} from '$lib/contexts/account.svelte';
import { type DojoConfig } from '$lib/dojoConfig';
import Controller, { type SessionPolicies } from '@cartridge/controller';
import type { AccountInterface, WalletAccount } from 'starknet';
import preset from './utils/preset.json';
import { traceWallet } from './utils/walnutTrace';

export class SvelteController extends Controller implements AccountProvider {
  _account?: WalletAccount;
  _username?: string;

  async connect(): Promise<WalletAccount | undefined> {
    // If the user is already logged in, return the existing account
    if (this._account) {
      return this._account;
    }

    try {
      const res: WalletAccount | undefined = await super.connect();

      if (res) {
        this._account = res;
        this._username = await super.username();

        console.info(
          `User ${this.getUsername()} has logged in successfully!\nAddress; ${
            this._account?.address
          }`,
        );

        return res;
      } else {
        throw 'Empty response!';
      }
    } catch (e) {
      console.error(e);
    }
  }

  async setupSession(): Promise<void> {
    // no-op
  }

  async loadSession(_storage: StoredSession): Promise<void> {
    // no-op
  }

  getWalletAccount(): AccountInterface | undefined {
    return this.getAccount();
  }

  supportsSession(): boolean {
    return true;
  }

  async disconnect(): Promise<void> {
    this._account = undefined;
    this._username = undefined;
    await super.disconnect();
  }

  getAccount(): AccountInterface | undefined {
    return traceWallet(this._account);
  }

  getUsername(): string | undefined {
    return this._username;
  }
}

function a2hex(str: string): string {
  const arr = [];
  for (let i = 0, l = str.length; i < l; i++) {
    const hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return '0x' + arr.join('');
}

export async function setupController(
  config: DojoConfig,
): Promise<SvelteController | undefined> {
  if (typeof window === 'undefined') {
    // We are on the server. Return nothing.
    return undefined;
  }

  const controller = new SvelteController({
    defaultChainId: a2hex(config.chainId), // SN_SEPOLIA in hex
    chains: [{ rpcUrl: config.rpcUrl }],
    preset: 'ponziland',
    // TODO(Red): Do proper conversions of policies
    policies: preset.chains.SN_MAIN.policies as unknown as
      | SessionPolicies
      | undefined,
  });

  console.info('Starting controller!');

  // Check if the controller is already connected
  if (await controller.probe()) {
    await controller.connect();
  }

  return controller;
}
