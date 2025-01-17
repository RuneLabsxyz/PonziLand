import { useAccount, type AccountProvider } from './contexts/account';
import { type AccountInterface } from 'starknet';

function wrapped<T>(value: T) {
  return { value };
}

type Wrapped<T> = { value?: T };

export const state: {
  isConnected: boolean;
  address?: string;
  sessionAccount?: AccountInterface;
  walletAccount?: AccountInterface;
} = $state({
  isConnected: false,
});

export function setup() {
  const accountManager = useAccount();

  const updateState = (provider: AccountProvider) => {
    const walletAccount = provider.getWalletAccount();
    console.log('Got the following:', walletAccount?.address);

    state.isConnected = walletAccount != null;
    state.address = walletAccount?.address;
    state.walletAccount = walletAccount;
  };

  const resetState = () => {
    state.address = undefined;
    state.isConnected = false;
    state.walletAccount = undefined;
  };

  // Initial state
  let currentProvider = accountManager.getProvider();
  if (currentProvider != null) {
    updateState(currentProvider);
  }

  // Listen on updates
  accountManager.listen((event) => {
    console.log('Event: ', event);
    switch (event.type) {
      case 'connected':
        updateState(event.provider);
        break;
      case 'disconnected':
        resetState();
        break;
    }
  });

  return state;
}

export default state;
