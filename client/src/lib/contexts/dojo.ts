import { AccountManager, useAccount, type AccountProvider } from './account';
import { useClient } from './client';
import { useStore } from './store';

export function useDojo() {
  const client = useClient();
  const accountManager = useAccount();
  const store = useStore();

  return {
    client,
    accountManager,
    store,
  };
}
