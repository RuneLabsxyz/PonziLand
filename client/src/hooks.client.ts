import posthog from 'posthog-js';
import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = ({ error, status }) => {
  // SvelteKit 2.0 offers a reliable way to check for a 404 error:
  if (status !== 404) {
    console.error('Error:', error);
    posthog.captureException(error);
  }
};
