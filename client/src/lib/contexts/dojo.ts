import { useAccount } from './account';
import { useClient } from './client';
import { useStore } from './store';

export function useDojo() {
  const client = useClient();
  const account = useAccount();
  const store = useStore();
  return {
    client,
    get account() {
      return account.getProvider();
    },
    store,
  };
}
