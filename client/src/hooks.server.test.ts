import { describe, it, expect } from 'vitest';
import { isMaintenanceModeEnabled } from './hooks.server';

describe('isMaintenanceModeEnabled', () => {
  it('should return false if there is no bypass token', () => {
    const bypassToken = '';

    const startDate = new Date();
    const now = new Date(startDate.getTime() + 500);
    const endDate = new Date(startDate.getTime() + 1000);

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      false,
    );
  });

  it('should return true if no start or end date is provided and has bypass token', () => {
    const bypassToken = 'bypass';

    const startDate = undefined;
    const endDate = undefined;

    const now = new Date();

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      true,
    );
  });

  it('should return false if between start and end date', () => {
    const bypassToken = 'bypass';

    const startDate = new Date();
    const now = new Date(startDate.getTime() + 500);
    const endDate = new Date(startDate.getTime() + 1000);

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      false,
    );
  });

  it('should return true if before start date', () => {
    const bypassToken = 'bypass';

    const startDate = new Date();
    const now = new Date(startDate.getTime() - 500);
    const endDate = new Date(startDate.getTime() + 1000);

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      true,
    );
  });

  it('should return true if after end date', () => {
    const bypassToken = 'bypass';

    const startDate = new Date();
    const now = new Date(startDate.getTime() + 1500);
    const endDate = new Date(startDate.getTime() + 1000);

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      true,
    );
  });

  it('should return false if after start date and no end date', () => {
    const bypassToken = 'bypass';

    const startDate = new Date();
    const now = new Date(startDate.getTime() + 1500);
    const endDate = undefined;

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      false,
    );
  });

  it('should return false if before end date and no start date', () => {
    const bypassToken = 'bypass';

    const startDate = undefined;
    const now = new Date();
    const endDate = new Date(now.getTime() + 1000);

    expect(isMaintenanceModeEnabled(bypassToken, now, startDate, endDate)).toBe(
      false,
    );
  });
});
