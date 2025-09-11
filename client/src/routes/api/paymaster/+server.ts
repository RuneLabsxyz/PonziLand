import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.text();
  const contentType = request.headers.get('content-type') || 'application/json';

  try {
    const response = await fetch('https://starknet.paymaster.avnu.fi', {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'x-paymaster-api-key': env.PAYMASTER_API_KEY!,
      } satisfies HeadersInit,
      body,
    });

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: {
        'Content-Type':
          response.headers.get('content-type') || 'application/json',
      },
    });
  } catch (error) {
    console.error('Paymaster proxy error:', error);
    return json(
      { error: 'Failed to proxy request to paymaster' },
      { status: 500 },
    );
  }
};
