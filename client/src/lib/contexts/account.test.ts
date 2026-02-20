import { describe, expect, it, vi } from 'vitest';
import { AccountManager } from './account.svelte';

describe('AccountManager.setupSessionIfSupported', () => {
  it('returns false when no provider is set', async () => {
    const setupSession = vi.fn();
    const managerLike = {
      _provider: undefined,
      setupSession,
    };

    const result = await AccountManager.prototype.setupSessionIfSupported.call(
      managerLike as any,
    );

    expect(result).toBe(false);
    expect(setupSession).not.toHaveBeenCalled();
  });

  it('returns false when provider does not support sessions', async () => {
    const setupSession = vi.fn();
    const managerLike = {
      _provider: {
        supportsSession: () => false,
      },
      setupSession,
    };

    const result = await AccountManager.prototype.setupSessionIfSupported.call(
      managerLike as any,
    );

    expect(result).toBe(false);
    expect(setupSession).not.toHaveBeenCalled();
  });

  it('runs setupSession and returns true when supported', async () => {
    const setupSession = vi.fn().mockResolvedValue(undefined);
    const managerLike = {
      _provider: {
        supportsSession: () => true,
      },
      setupSession,
    };

    const result = await AccountManager.prototype.setupSessionIfSupported.call(
      managerLike as any,
    );

    expect(result).toBe(true);
    expect(setupSession).toHaveBeenCalledTimes(1);
  });
});
