// TODO: Migrate this to a special library that will be used by both the implementation and the client.

import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
import account from '$lib/account.svelte';
import { useAccount } from '$lib/contexts/account.svelte';
import { Socialink } from '@runelabsxyz/socialink-sdk';
import type { Signature } from 'starknet';
import { get } from 'svelte/store';

let socialink: Socialink | undefined = $state();

let addressUsernameCache: Record<string, string> = $state({});

export async function getUsername(address: string) {
  if (address in addressUsernameCache) {
    return;
  }
}

export async function setupSocialink() {
  const account = useAccount();

  socialink = new Socialink(PUBLIC_SOCIALINK_URL, async () => ({
    wallet: account?.getProvider()?.getWalletAccount()!,
    provider: account?.getProviderName() as any,
  }));

  return socialink;
}

export function getSocialink() {
  if (!socialink) {
    throw new Error('Socialink not initialized');
  }

  return socialink;
}

async function fetchRegisterSignature(username: string) {
  const response = await fetch(
    `${PUBLIC_SOCIALINK_URL}/api/user/register?username=${username}`,
    {
      method: 'GET',
    },
  );

  if (!response.ok) {
    try {
      const error = await response.json();

      throw error.error;
    } catch (e) {
      console.error('Error while fetching register request: ', e);
      throw 'Impossible to get the signature request.';
    }
  }

  return await response.json();
}

async function sendRegister(
  typedData: any,
  signature: Signature,
  controller: boolean = false,
) {
  if (!account.address) {
    console.error(
      'No account address found',
      new Error('No account address found'),
    );
    return;
  }
  const response = await fetch(`${PUBLIC_SOCIALINK_URL}/api/user/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signature,
      address: account.address,
      typedData,
      method: controller ? 'controller' : 'starknetjs',
    }),
  });

  if (!response.ok) {
    try {
      const error = await response.json();

      throw error.error;
    } catch (e) {
      console.error('Error while submitting register', e);
      throw e;
    }
  }

  // Everything worked!
}

export async function register(username: string) {
  username = username.toLowerCase();
  // Fetch the signature from socialink
  const signatureResponse = await fetchRegisterSignature(username);

  // Get the account provider, and ask for a signature
  try {
    console.log('Sending signature request: ', signatureResponse);
    const provider = useAccount()?.getProvider();
    const account = provider?.getWalletAccount();

    const hash = await account?.hashMessage(signatureResponse);

    const signature = await account?.signMessage(signatureResponse);

    console.log('Signature:', signature, 'for hash:', hash);

    // Submit the response to the server
    await sendRegister(
      signatureResponse,
      signature!,
      useAccount()?.getProviderName() == 'controller',
    );
  } catch (e) {
    console.log(
      'An error occurred while signing and send the response message',
    );
    throw e;
  }
}

export async function checkUsername(username: string): Promise<true | string> {
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
