import { type AccountInterface } from 'starknet';
import { useAccount, type AccountProvider, type Event } from './context/account.svelte.js';
import { configureAccount, type AccountConfig } from './consts.js';


export const accountState: {
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

  accountState.isConnected = walletAccount != null;
  accountState.address = walletAccount?.address;
  accountState.walletAccount = walletAccount;

  accountState.providerName = useAccount()?.getProviderName();
};

const resetState = () => {
  accountState.address = undefined;
  accountState.isConnected = false;
  accountState.walletAccount = undefined;
  accountState.providerName = undefined;
};

export async function refresh() {
  const accountManager = useAccount();
  if (!accountManager) return;
  
  const currentProvider = accountManager.getProvider();
  if (currentProvider != null) {
    await updateState(currentProvider);
  } else {
    resetState();
  }
}

export async function setup(config?: Partial<AccountConfig>): Promise<typeof accountState> {
  if (config) {
    configureAccount(config);
  }
  
  if (isSetup) return accountState;

  const accountManager = useAccount();
  if (!accountManager) {
    console.warn('Account manager not initialized. Call setupAccount() first.');
    return accountState;
  }

  isSetup = true;

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

  return accountState;
}

export default accountState;
