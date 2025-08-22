import type { UserInfo } from '@runelabsxyz/socialink-sdk';
import { type AccountInterface } from 'starknet';
import { getSocialink } from './accounts/social/index.svelte';
import { useAccount, type AccountProvider } from './contexts/account.svelte';

export const accountState: {
  isConnected: boolean;
  address?: string;
  sessionAccount?: AccountInterface;
  walletAccount?: AccountInterface;
  profile?: UserInfo;
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

  const profile = await getSocialink().getUser(accountState.address!);
  accountState.profile = profile;
  accountState.providerName = useAccount()?.getProviderName();
};

const resetState = () => {
  accountState.address = undefined;
  accountState.isConnected = false;
  accountState.walletAccount = undefined;
  accountState.profile = undefined;
  accountState.providerName = undefined;
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

export async function setup(): Promise<typeof accountState> {
  if (isSetup) return accountState;

  isSetup = true;
  const accountManager = useAccount()!;

  // Initial state
  const currentProvider = accountManager.getProvider();
  if (currentProvider != null) {
    await updateState(currentProvider);
  }

  // Listen on updates
  accountManager.listen((event) => {
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
