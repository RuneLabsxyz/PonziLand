// Utilities for animations.
//
// The objective of this file is to provide a set of utilities for animations,
// that would make them easier to use and more readable.

/**
 * Executes multiple things at the same time.
 */
export async function simultaneously(
  ...promises: Promise<unknown>[]
): Promise<void> {
  await Promise.all(promises);
}

export async function execute(
  callback: () => Promise<void> | void,
  options: {
    repetitions?: number;
    delay?: number;
  },
): Promise<void> {
  for (let i = 0; i < (options.repetitions ?? 1); i++) {
    await callback();
    await wait(options.delay ?? 0);
  }
}

/**
 * Waits for a specified amount of time.
 *
 * While it seems not that useful, it allows for more animation readable code,
 * especially when used with async/await, or with svelte transitions.
 *
 * @param ms - The time to wait in milliseconds.
 */
export async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
