import { BYPASS_TOKEN } from '$env/static/private';
import { redirect, type Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Bypass all this trickery if the bypass token is set to '' (default)
  if (BYPASS_TOKEN === '') {
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

  if (event.url.pathname === '/maintenance') {
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
