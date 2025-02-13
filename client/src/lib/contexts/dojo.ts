import {
  AccountManager,
  useAccount,
  type AccountProvider,
} from './account.svelte';
import { useClient } from './client.svelte';
import { useStore } from './store.svelte';

export function useDojo() {
  console.log('Accessing useDojo!', new Error().stack);
  const client = useClient();
  const accountManager = useAccount();
  const store = useStore();

  return {
    client,
    accountManager,
    store,
  };
}
