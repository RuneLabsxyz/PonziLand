// Get the wanted system from the environment

import type { DojoConfig } from '$lib/dojoConfig';
import type { AccountInterface } from 'starknet';
import { PUBLIC_DOJO_BURNER_ADDRESS } from '$env/static/public';
import { setupBurnerAccount, useBurnerAccount } from '$lib/accounts/burner';
import { setupController, useController } from '$lib/accounts/controller';

/// Common functions required to be implemented by all account providers;
export type AccountProvider = {
  connect(): Promise<any>;
  getAccount(): AccountInterface | undefined;
  disconnect(): Promise<void>;
};

export function setupAccount(
  config: DojoConfig,
): Promise<AccountProvider | undefined> {
  if (PUBLIC_DOJO_BURNER_ADDRESS != 'null') {
    return setupBurnerAccount(config);
  } else {
    return setupController(config);
  }
}

export function useAccount(): AccountProvider {
  if (PUBLIC_DOJO_BURNER_ADDRESS != 'null') {
    return useBurnerAccount();
  } else {
    return useController();
  }
}
