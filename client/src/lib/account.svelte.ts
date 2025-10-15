import type { UserInfo } from '@runelabsxyz/socialink-sdk';
import { type AccountInterface } from 'starknet';
import { getSocialink } from './accounts/social/index.svelte';
import { useAccount, type AccountProvider } from './contexts/account.svelte';
import { FUSE_DISABLE_SOCIALINK } from './flags';

export const accountState: {
  isConnected: boolean;
  address?: string;
  sessionAccount?: AccountInterface;
  walletAccount?: AccountInterface;
  profile?: UserInfo;
  providerName?: string;
  providerIcon?: string;
} = $state({
  isConnected: false,
});

let isSetup = $state(false);

const updateState = async (provider: AccountProvider) => {
  const walletAccount = provider.getWalletAccount();

  accountState.isConnected = walletAccount != null;
  accountState.address = walletAccount?.address;
  accountState.walletAccount = walletAccount;

  if (FUSE_DISABLE_SOCIALINK) {
    accountState.profile = { exists: true, whitelisted: true } as UserInfo;
  } else {
    const profile = await getSocialink().getUser(accountState.address!);
    accountState.profile = profile;
  }
  const accountManager = useAccount();
  accountState.providerName = accountManager?.getProviderName();
  accountState.providerIcon = accountManager?.getProviderIcon();
};

const resetState = () => {
  accountState.address = undefined;
  accountState.isConnected = false;
  accountState.walletAccount = undefined;
  accountState.profile = undefined;
  accountState.providerName = undefined;
  accountState.providerIcon = undefined;
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
  let currentProvider = accountManager.getProvider();
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
