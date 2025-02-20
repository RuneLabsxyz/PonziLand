// TODO: Migrate this to a special library that will be used by both the implementation and the client.

import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
import { useAccount } from '$lib/contexts/account.svelte';
import { accountAddress } from '$lib/stores/stores.svelte';
import type { Signature } from 'starknet';
import { get } from 'svelte/store';

export type UserResponse = {
  exists: boolean;
  address: string;
  username?: string;
  providers?: Array<{
    service: string;
    username?: string;
  }>;
};

let cacheMap: Record<string, UserResponse> = $state({});

export async function getInfo(address: string) {
  // TODO: Ensure the format!
  const response = await fetch(`${PUBLIC_SOCIALINK_URL}/api/user/${address}`);

  if (!response.ok) {
    // Check if is a 404, and return the JSON body in that case
    if (response.status === 404) {
      const user = await response.json();
      cacheMap[address] = user;
      return user;
    } else {
      console.error('An error occurred while fetching user information');

      return {
        exists: false,
        address: address,
      };
    }
  }

  const user = await response.json();
  cacheMap[address] = user;
  return user;
}

async function fetchRegisterSignature(username: string) {
  const response = await fetch(`${PUBLIC_SOCIALINK_URL}/api/user/register`, {
    method: 'GET',
  });

  if (!response.ok) {
    try {
      const error = await response.json();

      throw error.error;
    } catch (e) {
      console.error('Error while fetching register request', e);
      throw 'Impossible to get the signature request.';
    }
  }

  return await response.json();
}

async function sendRegister(typedData: any, signature: Signature) {
  const response = await fetch('/api/user/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: typedData.message.username,
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
  // Fetch the signature from socialink
  const signatureResponse = await fetchRegisterSignature(username);

  // Get the account provider, and ask for a signature
  try {
    const signature = await useAccount()
      ?.getProvider()
      ?.getWalletAccount()
      ?.signMessage(signatureResponse);

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
    `${PUBLIC_SOCIALINK_URL}/api/user/availability/${username}`,
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

  return await response.json();
}
