import { getContext, onMount, setContext } from 'svelte';
import Controller from '@cartridge/controller';
import { type DojoConfig } from '$lib/dojoConfig';
import preset from './utils/preset.json';
import type { AccountInterface, WalletAccount } from 'starknet';
import type {
  AccountProvider,
  StoredSession,
} from '$lib/contexts/account.svelte';
import { trace, traceWallet } from './utils/walnut-trace';

export class SvelteController extends Controller implements AccountProvider {
  _account?: WalletAccount;
  _username?: string;

  async setupSession(): Promise<any> {
    // no-op
  }

  async loadSession(storage: StoredSession): Promise<any> {
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

const accountKey = Symbol('controller');

export async function connect(controller: Controller) {}

function a2hex(str: string): string {
  var arr = [];
  for (var i = 0, l = str.length; i < l; i++) {
    var hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return '0x' + arr.join('');
}

export async function setupController(
  config: DojoConfig,
): Promise<SvelteController | undefined> {
  let state: { value: Controller | undefined } = {
    value: undefined,
  };

  if (typeof window === 'undefined') {
    // We are on the server. Return nothing.
    return undefined;
  }

  const controller = new SvelteController({
    defaultChainId: "0x57505f4b4154414e41", // SN_SEPOLIA in hex
    chains: [{ rpcUrl: config.rpcUrl }],
  });

  console.info('Starting controller!');

  // Check if the controller is already connected
  if (await controller.probe()) {
    let res = await controller.connect();
    console.log('probe true, account: ', res);
  }

  return controller;
}