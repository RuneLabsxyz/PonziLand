import { building } from '$app/environment';
import { BYPASS_TOKEN } from '$env/static/private';
import { CLOSING_DATE, DATE_GATE } from '$lib/const';
import { redirect, type Handle } from '@sveltejs/kit';

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

  console.warn('Maintenance Debug', {
    bypassToken,
    now,
    startDate,
    endDate,
    noBypass,
    currentlyBuilding,
    isAfterDateGate,
    isBeforeClosingDate,
    noStartAndEnd,
  });

  if (
    noBypass ||
    currentlyBuilding ||
    (isAfterDateGate && isBeforeClosingDate && !noStartAndEnd)
  ) {
    return false;
  }

  return true;
}

export const handle: Handle = async ({ event, resolve }) => {
  // Bypass all this trickery if the bypass token is set to '' (default), or if we're building
  // Or if we are after the DATE_GATE

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
