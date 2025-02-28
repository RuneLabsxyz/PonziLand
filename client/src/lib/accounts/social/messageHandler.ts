import { PUBLIC_SOCIALINK_URL } from '$env/static/public';
import { rei } from '@reown/appkit/networks';
import type { Account, AccountInterface, Signature, TypedData } from 'starknet';

export type SignatureRequest = MessageEvent<{
  type: 'signature_request';
  data: {
    payload: TypedData;
  };
}>;

export type SignatureResponse = {
  type: 'signature_response';
  data: {
    signature: Signature;
  };
};

export type AddressRequest = MessageEvent<{
  type: 'address_request';
}>;

export type AddressResponse = {
  type: 'address';
  data: {
    address: string | undefined;
  };
};

export type Request = SignatureRequest | AddressRequest;

export function listen(
  iframe: HTMLIFrameElement,
  accountProvider: () => AccountInterface | Account | undefined,
) {
  async function handleSignature(event: SignatureRequest['data']) {
    const data = event.data.payload;

    console.log('Signature Request Received:', data);
    const account = accountProvider();

    const signature = await account?.signMessage(data);

    if (!signature) {
      console.error('Failed to sign message');
      return;
    }

    console.log('Signature:', signature);

    // Notify the iframe
    iframe.contentWindow?.postMessage(
      {
        type: 'signature_response',
        data: {
          signature,
        },
      } satisfies SignatureResponse,
      // Because it is now signed, we want to make sure no one can MITM.
      PUBLIC_SOCIALINK_URL,
    );
  }

  async function handleAddress(event: AddressRequest['data']) {
    const address = accountProvider()?.address;

    // Notify the iframe
    iframe.contentWindow?.postMessage(
      {
        type: 'address',
        data: {
          address,
        },
      } satisfies AddressResponse,
      PUBLIC_SOCIALINK_URL,
    );
  }

  const handler = async (event: Request) => {
    const eventData: Request['data'] = event.data;

    console.log('Received event: ', eventData);

    switch (eventData.type) {
      case 'signature_request':
        return await handleSignature(eventData);
      case 'address_request':
        return await handleAddress(eventData);
    }
  };
  // Listen on message events
  window.addEventListener('message', handler);

  return () => {
    window.removeEventListener('message', handler);
  };
}
