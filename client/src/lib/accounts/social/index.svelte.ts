import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
import { useAccount } from '$lib/contexts/account.svelte';
import { Socialink } from '@runelabsxyz/socialink-sdk';
import { FUSE_DISABLE_SOCIALINK } from '$lib/flags';

let socialink: Socialink | undefined = $state();

export async function setupSocialink() {
  if (FUSE_DISABLE_SOCIALINK) {
    return null;
  }

  const account = useAccount();

  socialink = new Socialink(PUBLIC_SOCIALINK_URL, async () => ({
    provider: account?.getProviderName()!,
    wallet: account?.getProvider()?.getWalletAccount()!,
  }));

  // Initialize headless mode for registration and linking
  await socialink.initHeadless();

  console.log('Socialink initialized in headless mode!');
  return socialink;
}

export function getSocialink(): Socialink | null {
  if (FUSE_DISABLE_SOCIALINK) {
    return {
      getUser: async () => ({ exists: false, whitelisted: false }),
      registerHeadless: async () => {},
      startLink: async () => {},
    } as any;
  }

  return socialink ?? null;
}

export async function register(username: string) {
  if (FUSE_DISABLE_SOCIALINK) {
    console.log('Socialink registration disabled by fuse');
    return;
  }

  if (!socialink) {
    throw new Error('Socialink not initialized');
  }

  username = username.toLowerCase();
  await socialink.registerHeadless(username);
}

export async function checkUsername(username: string): Promise<true | string> {
  if (FUSE_DISABLE_SOCIALINK) {
    return true; // Always available when socialink is disabled
  }

  const response = await fetch(
    `${PUBLIC_SOCIALINK_URL}/api/user/availability/${username.toLowerCase()}`,
  );

  if (!response.ok) {
    try {
      const error = await response.json();
      throw error.error;
    } catch (e) {
      console.error('Error while checking username', e);
      throw e;
    }
  }

  const data = await response.json();
  return data.available ? true : data.error;
}
