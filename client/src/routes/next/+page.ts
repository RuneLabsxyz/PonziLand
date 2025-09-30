import type { PageLoad } from './$types';

export const ssr = false;
export const prerender = false;

export const load: PageLoad = async ({ url }) => {
  // Extract tutorial mode from URL search params
  const isTutorialMode = url.searchParams.has('tutorial');

  return {
    isTutorialMode,
  };
};
