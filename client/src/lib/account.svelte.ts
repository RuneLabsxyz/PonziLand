import type { UserInfo } from '@runelabsxyz/socialink-sdk';
import { type AccountInterface } from 'starknet';
import { getSocialink } from './accounts/social/index.svelte';
import { useAccount, type AccountProvider } from './contexts/account.svelte';

export const state: {
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

  state.isConnected = walletAccount != null;
  state.address = walletAccount?.address;
  state.walletAccount = walletAccount;

  const profile = await getSocialink().getUser(state.address!);
  state.profile = profile;
  state.providerName = useAccount()?.getProviderName();
};

const resetState = () => {
  state.address = undefined;
  state.isConnected = false;
  state.walletAccount = undefined;
  state.profile = undefined;
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
  if (isSetup) {
    return state;
  }

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

  return state;
}

export default state;
