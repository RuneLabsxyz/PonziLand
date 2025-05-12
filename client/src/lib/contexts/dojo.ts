import {
  AccountManager,
  useAccount,
  type AccountProvider,
} from './account.svelte';
import { useClient } from './client.svelte';
import { useStore } from './store.svelte';

export function useDojo() {
  const client = useClient();
  const accountManager = useAccount();

  return {
    client,
    accountManager,
  };
}
