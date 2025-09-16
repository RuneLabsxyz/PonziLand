import posthog from 'posthog-js';
import { browser } from '$app/environment';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';

export const load = async () => {
  if (browser && PUBLIC_POSTHOG_KEY && PUBLIC_POSTHOG_KEY !== '') {
    try {
      posthog.init(PUBLIC_POSTHOG_KEY, {
        api_host: '/forward',
        ui_host: 'https://eu.i.posthog.com',
        defaults: '2025-05-24',
        persistence: 'memory',
        disable_persistence: true,
      });
    } catch (error) {
      console.error('PostHog initialization failed:', error);
    }
  }

  return;
};
