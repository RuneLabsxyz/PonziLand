// TODO: Migrate this to a special library that will be used by both the implementation and the client.

import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
import { useAccount } from '$lib/contexts/account.svelte';
import { accountAddress } from '$lib/stores/stores.svelte';
import type { Signature } from 'starknet';
import { get } from 'svelte/store';
import { Socialink, type UserInfo } from '@runelabsxyz/socialink-sdk';

let socialink: Socialink | undefined = $state();

export async function setupSocialink() {
  const account = useAccount();

  socialink = new Socialink(
    PUBLIC_SOCIALINK_URL,
    async () => account?.getProvider()?.getWalletAccount()!,
  );

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

async function sendRegister(typedData: any, signature: Signature) {
  const response = await fetch(`${PUBLIC_SOCIALINK_URL}/api/user/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      signature,
      address: get(accountAddress),
      typedData,
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

    const account = useAccount()?.getProvider()?.getWalletAccount();
    const signature = await account?.signMessage(signatureResponse);

    console.log('Signature:', signature);

    // Submit the response to the server
    await sendRegister(signatureResponse, signature!);

    console.log('Successfully registered!');
  } catch (e) {
    console.log(
      'An error occurred while signing and send the response message',
    );
  }
}

export async function checkUsername(username: string) {
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

  return (await response.json()).available;
}
