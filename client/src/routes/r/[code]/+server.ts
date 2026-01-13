import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const REFERRAL_COOKIE_NAME = 'ponziland_referral';
const REFERRAL_CODE_REGEX = /^[A-Z0-9]{6}$/i;

export const GET: RequestHandler = ({ params, cookies, url }) => {
  const raw = params.code ?? '';
  const code = raw.toUpperCase();

  if (REFERRAL_CODE_REGEX.test(code)) {
    cookies.set(REFERRAL_COOKIE_NAME, code, {
      path: '/',
      httpOnly: false,
      secure: url.protocol === 'https:',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  throw redirect(302, '/game');
};
