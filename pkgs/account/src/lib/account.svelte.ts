import { type AccountInterface } from 'starknet';
import { useAccount, type AccountProvider, type Event } from './context/account.svelte.js';


export const state: {
  isConnected: boolean;
  address?: string;
  sessionAccount?: AccountInterface;
  walletAccount?: AccountInterface;
  providerName?: string;
} = $state({
  isConnected: false,
});

let isSetup = $state(false);

const updateState = async (provider: AccountProvider) => {
  const walletAccount = provider.getWalletAccount();

  state.isConnected = walletAccount != null;
  state.address = walletAccount?.address;
  state.walletAccount = walletAccount;

  state.providerName = useAccount()?.getProviderName();
};

const resetState = () => {
  state.address = undefined;
  state.isConnected = false;
  state.walletAccount = undefined;
  state.providerName = undefined;
};

export async function refresh() {
  const accountManager = useAccount()!;
  const currentProvider = accountManager.getProvider();
  if (currentProvider != null) {
    await updateState(currentProvider);
  } else {
    resetState();
  }
}

export async function setup() {
  if (isSetup) return;

  isSetup = true;
  const accountManager = useAccount()!;

  // Initial state
  let currentProvider = accountManager.getProvider();
  if (currentProvider != null) {
    await updateState(currentProvider);
  }

  // Listen on updates
  accountManager.listen((event: Event) => {
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
