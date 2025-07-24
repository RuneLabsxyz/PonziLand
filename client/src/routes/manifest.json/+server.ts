export const prerender = process.env.DYNAMIC_CONFIG !== 'true';

import { building } from '$app/environment';
import staticManifest from '$manifest';
import fs from 'fs';

let manifest: unknown | undefined;

export function _getManifest() {
  if (manifest !== undefined) {
    return manifest;
  }

  if (!building && !prerender) {
    // Fetch manifest from environment variable (MANIFEST_PATH) using node fs

    manifest = JSON.parse(fs.readFileSync(process.env.MANIFEST_PATH!, 'utf8'));

    return manifest;
  }
  // Fallback to static manifest
  return staticManifest;
}

export const GET = async ({ fetch }) => {
  return new Response(JSON.stringify(_getManifest()), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};
