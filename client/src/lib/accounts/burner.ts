//TODO: Add cartridge controller at some point

import type { DojoConfig } from '@dojoengine/core';
import { BurnerManager, setupBurnerManager } from '@dojoengine/create-burner';
import { getContext, setContext } from 'svelte';

import { PUBLIC_DOJO_BURNER_ADDRESS } from '$env/static/public';
import type { AccountProvider } from '$lib/contexts/account';

const accountKey = Symbol('dojoAccountBurner');

// For the context, svelte is weird.
// You cannot reassign, because then the change is not propagated through the setContext (js identity things)
// So we need to wrap it in a {value: value} to make it work.

function toAccount(burner?: BurnerManager): AccountProvider | undefined {
  if (burner == null) {
    return undefined;
  }

  return {
    async connect() {
      if (!burner.account) {
        const account = await burner.create();
        burner.select(account.address);
      }

      return burner.account;
    },

    async disconnect() {
      if (burner.account) {
        burner.delete(burner.account.address);
      }
    },

    getAccount() {
      return burner.account ?? undefined;
    },

    getWalletAccount() {
      // Burners does not have any ui, so this works.
      return this.getAccount();
    },

    async setupSession() {
      // NO-OP, we don't need a session system
    },

    supportsSession() {
      // We do not open a popup to sign
      return true;
    },
  };
}

export function setupBurnerAccount(
  config: DojoConfig,
): Promise<AccountProvider | undefined> {
  if (PUBLIC_DOJO_BURNER_ADDRESS == null) {
    // Burner is not available locally.
    return new Promise((ok) => ok(undefined));
  }
  // We cannot put setupBurner in an async context, otherwise we get a runtime error.
  return setupBurner(config).then(toAccount);
}

export function setupBurner(
  config: DojoConfig,
): Promise<BurnerManager | undefined> {
  let state: { value: BurnerManager | undefined } = { value: undefined };

  const promise = (async () => {
    if (typeof window === 'undefined') {
      // We are on the server. Return nothing.
      return undefined;
    }
    return await setupBurnerManager(config);
  })().then((e) => (state.value = e));

  setContext(accountKey, state);

  return promise;
}

export function useBurner(): BurnerManager {
  const contextValue = getContext<{ value: BurnerManager | undefined }>(
    accountKey,
  ).value;

  if (contextValue == null) {
    throw 'The context is null! Please await for setupBurner before using components containing useBurner()!';
  }

  return contextValue;
}

export function useBurnerAccount(): AccountProvider {
  return toAccount(useBurner())!;
}
