import { useAccount } from './account.svelte';
import { useClient } from './client.svelte';

export function useDojo() {
  const client = useClient();
  const accountManager = useAccount();

  return {
    client,
    accountManager,
  };
}
