import { get, type Readable } from 'svelte/store';
import type { BaseLand } from './land';
import { DEFAULT_TIMEOUT } from '$lib/const';

// Generic wait function for any Svelte store
export function waitForStoreChange<T>(
  store: Readable<T>,
  predicate: (value: T) => boolean,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<T> {
  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout;
    let unsubscribe: (() => void) | undefined;

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (unsubscribe) {
        unsubscribe();
      }
      reject(new Error(`Wait timeout after ${timeout}ms`));
    }, timeout);

    // Check if condition is already met
    const currentValue = get(store);
    if (predicate(currentValue)) {
      clearTimeout(timeoutId);
      resolve(currentValue);
      return;
    }

    // Subscribe to store changes
    unsubscribe = store.subscribe((value) => {
      if (predicate(value)) {
        clearTimeout(timeoutId);
        if (unsubscribe) {
          unsubscribe();
        }
        resolve(value);
      }
    });
  });
}

// Specific wait function for land changes
export function waitForLandChange(
  landStore: Readable<BaseLand>,
  predicate: (land: BaseLand) => boolean,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<BaseLand> {
  return waitForStoreChange(landStore, predicate, timeout);
}

// Wait for land to become a specific type
export function waitForLandType<T extends BaseLand>(
  landStore: Readable<BaseLand>,
  typeChecker: (land: BaseLand) => land is T,
  timeout: number = DEFAULT_TIMEOUT,
): Promise<T> {
  return waitForStoreChange(landStore, typeChecker, timeout) as Promise<T>;
}
