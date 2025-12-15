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
let isTutorialMode = $state(false);
let isSpectatorMode = $state(false);

const updateState = async (provider: AccountProvider) => {
  if (isTutorialMode || isSpectatorMode) {
    return;
  }

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
  if (isTutorialMode || isSpectatorMode) {
    return;
  }

  accountState.address = undefined;
  accountState.isConnected = false;
  accountState.walletAccount = undefined;
  accountState.profile = undefined;
  accountState.providerName = undefined;
  accountState.providerIcon = undefined;
};

export async function refresh() {
  if (isTutorialMode || isSpectatorMode) {
    return;
  }

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

  if (isTutorialMode || isSpectatorMode) {
    return accountState;
  }

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

// Tutorial mode: Set fake account state for tutorial
export function setTutorialMode(enabled: boolean) {
  isTutorialMode = enabled;

  if (enabled) {
    // Set fake connection state for tutorial
    accountState.isConnected = true;
    accountState.address =
      '0xABCD000000000000000000000000000000000000000000000000000000FADE'; // Tutorial fake address
    accountState.walletAccount = undefined; // Don't need actual wallet account for tutorial
    accountState.sessionAccount = undefined;
    accountState.profile = { exists: true, whitelisted: true } as UserInfo; // Fake profile
    accountState.providerName = 'Tutorial Wallet';
    accountState.providerIcon = '/ui/icons/Icon_Coin2.png'; // Use existing icon
  } else {
    // Reset to normal state
    isTutorialMode = false;
    resetState();
  }
}

// Export function to check if in tutorial mode
export function isTutorial() {
  return isTutorialMode;
}

// Spectator mode: Set fake account state for spectator viewing
export function setSpectatorMode(enabled: boolean) {
  isSpectatorMode = enabled;

  if (enabled) {
    // Set minimal connection state for spectator mode
    accountState.isConnected = false; // Spectator is read-only, no wallet
    accountState.address = undefined;
    accountState.walletAccount = undefined;
    accountState.sessionAccount = undefined;
    accountState.profile = undefined;
    accountState.providerName = 'Spectator Mode';
    accountState.providerIcon = '/ui/icons/Icon_Thin_Eye.png';
  } else {
    isSpectatorMode = false;
    resetState();
  }
}

// Export function to check if in spectator mode
export function isSpectator() {
  return isSpectatorMode;
}

export default accountState;
