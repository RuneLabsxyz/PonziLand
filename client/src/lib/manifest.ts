let manifestCache: any = null;
let manifestPromise: Promise<any> | null = null;
/**
 * Loads the manifest asynchronously.
 * - On the client (browser): Fetches from /manifest.json HTTP endpoint
 * - On the server: Uses _getManifest function directly
 */
export async function loadManifest(): Promise<any> {
  // Return cached manifest if available
  if (manifestCache !== null) {
    return manifestCache;
  }

  // Return existing promise if one is already in progress
  if (manifestPromise !== null) {
    return await manifestPromise;
  }

  // Create and cache the promise
  manifestPromise = (async () => {
    try {
      // Client-side: fetch from HTTP endpoint
      const response = await fetch('/manifest.json');
      if (!response.ok) {
        throw new Error(
          `Failed to fetch manifest: ${response.status} ${response.statusText}`,
        );
      }
      manifestCache = await response.json();
      return manifestCache;
    } catch (error) {
      // Clear the promise on error so retry is possible
      manifestPromise = null;
    } finally {
      // Clear the promise once completed (success or failure)
      manifestPromise = null;
    }
  })();

  return await manifestPromise;
}

/**
 * Gets the cached manifest synchronously.
 * This should only be used after loadManifest() has been called at least once.
 * Throws an error if manifest hasn't been loaded yet.
 */
export function getManifest(): any {
  if (manifestCache === null) {
    throw new Error('Manifest not loaded yet. Call loadManifest() first.');
  }
  return manifestCache;
}

/**
 * Clears the manifest cache. Useful for testing or when manifest needs to be reloaded.
 */
export function clearManifestCache(): void {
  manifestCache = null;
  manifestPromise = null;
}
