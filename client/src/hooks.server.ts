import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { CLOSING_DATE, DATE_GATE } from '$lib/const';
import { redirect, type Handle } from '@sveltejs/kit';
import type { HandleServerError } from '@sveltejs/kit';
import { PostHog } from 'posthog-node';

const allowedUrls = ['/maintenance', '/dashboard'];

export function isMaintenanceModeEnabled(
  bypassToken: string,
  now: Date,
  startDate: Date | undefined,
  endDate: Date | undefined,
) {
  const noBypass = bypassToken === '';
  const currentlyBuilding = building;
  const isAfterDateGate = startDate === undefined || now > startDate;
  const isBeforeClosingDate = endDate === undefined || now < endDate;
  const noStartAndEnd = startDate === undefined && endDate === undefined;

  if (
    noBypass ||
    currentlyBuilding ||
    (isAfterDateGate && isBeforeClosingDate && !noStartAndEnd)
  ) {
    return false;
  }

  return true;
}

const handlePosthog: Handle = async ({ event, resolve }) => {
  const { pathname } = event.url;

  // Determine target hostname based on static or dynamic ingestion
  const hostname = pathname.startsWith('/forward/static/')
    ? 'eu-assets.i.posthog.com' // change us to eu for EU Cloud
    : 'eu.i.posthog.com'; // change us to eu for EU Cloud

  // Build external URL
  const url = new URL(event.request.url);
  url.protocol = 'https:';
  url.hostname = hostname;
  url.port = '443';
  url.pathname = pathname.replace('/forward/', '');

  // Clone and adjust headers
  const headers = new Headers(event.request.headers);
  headers.set('Accept-Encoding', '');
  headers.set('host', hostname);

  // Proxy the request to the external host
  const response = await fetch(url.toString(), {
    method: event.request.method,
    headers,
    body: event.request.body,
    // @ts-expect-error - For some reason this parameter is required, but not known
    duplex: 'half',
  });

  return response;
};

import { PUBLIC_POSTHOG_KEY } from '$env/static/public';

const client = PUBLIC_POSTHOG_KEY
  ? new PostHog(PUBLIC_POSTHOG_KEY, {
      host: 'https://eu.i.posthog.com',
    })
  : null;

export const handleError: HandleServerError = async ({ error, status }) => {
  if (status !== 404 && client) {
    client.captureException(error);
    await client.shutdown();
  }
};

export const handle: Handle = async ({ event, resolve }) => {
  if (building) {
    return await resolve(event);
  }

  const { pathname } = event.url;

  if (pathname.startsWith('/forward/')) {
    return handlePosthog({ event, resolve });
  }

  const BYPASS_TOKEN = env.BYPASS_TOKEN ?? '';

  if (
    !isMaintenanceModeEnabled(BYPASS_TOKEN, new Date(), DATE_GATE, CLOSING_DATE)
  ) {
    if (event.url.pathname === '/maintenance') {
      return redirect(302, '/');
    }

    return await resolve(event);
  }

  if (event.url.searchParams.has('token')) {
    const token = event.url.searchParams.get('token');
    if (token === BYPASS_TOKEN) {
      // Set the cookie
      event.cookies.set('BypassToken', BYPASS_TOKEN, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      return await resolve(event);
    }
  }

  if (allowedUrls.includes(event.url.pathname)) {
    // Resolve as normal
    return await resolve(event);
  }

  // For the others, check the cookies, and if we have the good value, resolve as normal. Otherwise redirect to /maintenance
  const cookie = event.cookies.get('BypassToken');
  if (cookie === BYPASS_TOKEN) {
    return await resolve(event);
  } else {
    return redirect(302, '/maintenance');
  }
};
