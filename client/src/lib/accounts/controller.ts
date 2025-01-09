import { getContext, onMount, setContext } from 'svelte';
import Controller from '@cartridge/controller';
import { type DojoConfig } from '$lib/dojoConfig';
import type { AccountInterface, WalletAccount } from 'starknet';
import type ControllerProvider from '@cartridge/controller';

export class SvelteController extends Controller {
  _account?: AccountInterface;
  _username?: string;

  async connect(): Promise<WalletAccount | undefined> {
    try {
      const res = await super.connect();
      if (res) {
        this._account = res;
        this._username = await super.username();

        console.info(
          `User ${this.getUsername()} has logged in successfully!\nAddress; ${
            this._account.address
          }`,
        );

        return res;
      } else {
        throw 'Empty response!';
      }
    } catch (e) {
      console.log(e);
    }
  }

  async disconnect(): Promise<void> {
    this._account = undefined;
    this._username = undefined;
    await super.disconnect();
  }

  getAccount(): AccountInterface | undefined {
    return this._account;
  }

  getUsername(): string | undefined {
    return this._username;
  }
}

const accountKey = Symbol('controller');

export async function connect(controller: SvelteController) {}

export function setupController(
  config: DojoConfig,
): Promise<SvelteController | undefined> {
  let state: { value: SvelteController | undefined } = {
    value: undefined,
  };

  const promise = (async () => {
    if (typeof window === 'undefined') {
      // We are on the server. Return nothing.
      return undefined;
    }

    const controller = new SvelteController({
      rpc: config.rpcUrl,
      policies: config.policies,
    });

    // Check if the controller is already connected
    if (await controller.probe()) {
      await controller.connect();
    }

    return controller;
  })().then((e) => (state.value = e));

  setContext(accountKey, state);

  return promise;
}

export function useController(): SvelteController {
  const contextValue = getContext<{ value: SvelteController | undefined }>(
    accountKey,
  ).value;

  if (contextValue == null) {
    throw 'The context is null! Please await for setupController before using components containing useController()!';
  }

  return contextValue;
}
