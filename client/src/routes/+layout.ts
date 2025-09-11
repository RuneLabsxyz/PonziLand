import posthog from 'posthog-js';
import { browser } from '$app/environment';

export const load = async () => {
  if (browser) {
    posthog.init('phc_dOLLHkrkw8c0eJI1tg8ypAHKAvk5qIo9NJTfciRUg9B', {
      api_host: '/forward',
      ui_host: 'https://eu.i.posthog.com',
      defaults: '2025-05-24',
      persistence: 'memory',
      disable_persistence: true,
    });
  }

  return;
};
