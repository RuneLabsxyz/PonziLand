import { rei } from '@reown/appkit/networks';
import { getSocialink } from './accounts/social/index.svelte';
import { useAccount, type AccountProvider } from './contexts/account.svelte';
import { type AccountInterface } from 'starknet';
import { Result } from 'postcss';
import type { UserInfo } from '@runelabsxyz/socialink-sdk';

export const state: {
  isConnected: boolean;
  address?: string;
  sessionAccount?: AccountInterface;
  walletAccount?: AccountInterface;
  profile?: UserInfo;
} = $state({
  isConnected: false,
});

const updateState = async (provider: AccountProvider) => {
  const walletAccount = provider.getWalletAccount();
  console.log('Got the following:', walletAccount?.address);

  state.isConnected = walletAccount != null;
  state.address = walletAccount?.address;
  state.walletAccount = walletAccount;

  const profile = await getSocialink().getUser(state.address!);
  console.log('ayayayay', profile);
  state.profile = profile;
};

const resetState = () => {
  state.address = undefined;
  state.isConnected = false;
  state.walletAccount = undefined;
  state.profile = undefined;
};

export function refresh() {
  const accountManager = useAccount()!;
  const currentProvider = accountManager.getProvider();
  if (currentProvider != null) {
    updateState(currentProvider);
  } else {
    resetState();
  }
}

export function setup() {
  const accountManager = useAccount()!;

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
