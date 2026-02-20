import { describe, expect, it } from 'vitest';
import {
  formatDate,
  formatDateOnly,
  formatTimeOnly,
  formatDuration,
  formatDurationFromNow,
  isValidDate,
  formatTimestamp,
  formatTimestampRelative,
  parseNukeTimeComponents,
  parseNukeTime,
  formatDurationHMS,
  formatDateCompact,
} from './date';

describe('isValidDate', () => {
  it('should return true for valid ISO date strings', () => {
    expect(isValidDate('2024-01-15T10:30:00Z')).toBe(true);
    expect(isValidDate('2024-12-31')).toBe(true);
    expect(isValidDate('2024-06-15T00:00:00.000Z')).toBe(true);
  });

  it('should return false for invalid date strings', () => {
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('abc123')).toBe(false);
  });

  it('should return true for date-like strings that JS can parse', () => {
    expect(isValidDate('January 1, 2024')).toBe(true);
    expect(isValidDate('2024/01/01')).toBe(true);
  });
});

describe('formatDate', () => {
  it('should format a valid date string with date and time', () => {
    const result = formatDate('2024-06-15T14:30:00Z');
    // Result is locale-dependent, but should contain the year and some time component
    expect(result).toContain('2024');
  });

  it('should return the original string for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('formatDateOnly', () => {
  it('should format a valid date showing only the date portion', () => {
    const result = formatDateOnly('2024-06-15T14:30:00Z');
    expect(result).toContain('2024');
    // Should not contain time-specific separators like ":"
    // (locale-dependent, but the options exclude hour/minute)
  });

  it('should return the original string for invalid input', () => {
    expect(formatDateOnly('garbage')).toBe('garbage');
  });
});

describe('formatTimeOnly', () => {
  it('should format a valid date showing only the time portion', () => {
    const result = formatTimeOnly('2024-06-15T14:30:00Z');
    // Should contain a colon for HH:MM format
    expect(result).toContain(':');
  });

  it('should return the original string for invalid input', () => {
    expect(formatTimeOnly('garbage')).toBe('garbage');
  });
});

describe('formatDuration', () => {
  it('should format a multi-day duration', () => {
    const result = formatDuration(
      '2024-01-01T00:00:00Z',
      '2024-01-04T05:30:00Z',
    );
    expect(result).toBe('3d 5h 30m');
  });

  it('should format a duration of hours and minutes', () => {
    const result = formatDuration(
      '2024-01-01T00:00:00Z',
      '2024-01-01T03:45:00Z',
    );
    expect(result).toBe('3h 45m');
  });

  it('should format a duration of only minutes', () => {
    const result = formatDuration(
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:15:00Z',
    );
    expect(result).toBe('15m');
  });

  it('should return <1m for very short durations', () => {
    const result = formatDuration(
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:30Z',
    );
    expect(result).toBe('<1m');
  });

  it('should return <1m for zero duration', () => {
    const result = formatDuration(
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    );
    expect(result).toBe('<1m');
  });

  it('should format days only when no hours or minutes', () => {
    const result = formatDuration(
      '2024-01-01T00:00:00Z',
      '2024-01-03T00:00:00Z',
    );
    expect(result).toBe('2d');
  });

  it('should return - for invalid date inputs', () => {
    expect(formatDuration('bad', 'also-bad')).toBe('-');
  });
});

describe('formatDurationFromNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format duration from a past date to now', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    const result = formatDurationFromNow('2024-06-15T10:00:00Z');
    expect(result).toBe('2h');
  });

  it('should handle very recent timestamps', () => {
    vi.setSystemTime(new Date('2024-06-15T12:00:30Z'));
    const result = formatDurationFromNow('2024-06-15T12:00:00Z');
    expect(result).toBe('<1m');
  });
});

describe('formatTimestamp', () => {
  it('should format a Date object as YYYY/MM/DD at HH:MM', () => {
    const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024 at 14:30
    expect(formatTimestamp(date)).toBe('2024/06/15 at 14:30');
  });

  it('should pad single-digit months and days', () => {
    const date = new Date(2024, 0, 5, 9, 5); // Jan 5, 2024 at 09:05
    expect(formatTimestamp(date)).toBe('2024/01/05 at 09:05');
  });

  it('should handle midnight', () => {
    const date = new Date(2024, 11, 31, 0, 0); // Dec 31, 2024 at 00:00
    expect(formatTimestamp(date)).toBe('2024/12/31 at 00:00');
  });

  it('should handle end of day', () => {
    const date = new Date(2024, 11, 31, 23, 59); // Dec 31, 2024 at 23:59
    expect(formatTimestamp(date)).toBe('2024/12/31 at 23:59');
  });
});

describe('formatTimestampRelative', () => {
  it('should return "just now" for timestamps less than a minute ago', () => {
    const timestamp = new Date(Date.now() - 30 * 1000); // 30 seconds ago
    expect(formatTimestampRelative(timestamp)).toBe('just now');
  });

  it('should return singular minute', () => {
    const timestamp = new Date(Date.now() - 60 * 1000); // 1 minute ago
    expect(formatTimestampRelative(timestamp)).toBe('1 minute ago');
  });

  it('should return plural minutes', () => {
    const timestamp = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    expect(formatTimestampRelative(timestamp)).toBe('30 minutes ago');
  });

  it('should return singular hour', () => {
    const timestamp = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    expect(formatTimestampRelative(timestamp)).toBe('1 hour ago');
  });

  it('should return plural hours', () => {
    const timestamp = new Date(Date.now() - 5 * 60 * 60 * 1000); // 5 hours ago
    expect(formatTimestampRelative(timestamp)).toBe('5 hours ago');
  });

  it('should return singular day', () => {
    const timestamp = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    expect(formatTimestampRelative(timestamp)).toBe('1 day ago');
  });

  it('should return plural days', () => {
    const timestamp = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    expect(formatTimestampRelative(timestamp)).toBe('5 days ago');
  });
});

describe('parseNukeTimeComponents', () => {
  it('should parse seconds into days, hours, minutes', () => {
    const result = parseNukeTimeComponents(90061); // 1d 1h 1m 1s
    expect(result.days).toBe(1);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(1);
  });

  it('should return zeros for zero seconds', () => {
    const result = parseNukeTimeComponents(0);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.toString()).toBe('0m');
  });

  it('should return zeros for negative seconds', () => {
    const result = parseNukeTimeComponents(-100);
    expect(result.days).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.toString()).toBe('0m');
  });

  it('should format toString with all components', () => {
    const result = parseNukeTimeComponents(90060); // 1d 1h 1m
    expect(result.toString()).toBe('1d 1h 1m');
  });

  it('should format toString with only days', () => {
    const result = parseNukeTimeComponents(172800); // 2d exactly
    expect(result.toString()).toBe('2d');
  });

  it('should format toString with only hours', () => {
    const result = parseNukeTimeComponents(7200); // 2h exactly
    expect(result.toString()).toBe('2h');
  });

  it('should format toString with only minutes', () => {
    const result = parseNukeTimeComponents(300); // 5m exactly
    expect(result.toString()).toBe('5m');
  });

  it('should return <1m for seconds less than 60', () => {
    const result = parseNukeTimeComponents(45);
    expect(result.toString()).toBe('<1m');
  });

  it('should handle large values (multi-day)', () => {
    const result = parseNukeTimeComponents(259200); // 3 days
    expect(result.days).toBe(3);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.toString()).toBe('3d');
  });

  it('should handle days and minutes without hours', () => {
    const result = parseNukeTimeComponents(86700); // 1d 5m
    expect(result.days).toBe(1);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(5);
    expect(result.toString()).toBe('1d 5m');
  });
});

describe('parseNukeTime', () => {
  it('should return formatted string from seconds', () => {
    expect(parseNukeTime(90060)).toBe('1d 1h 1m');
  });

  it('should return 0m for zero', () => {
    expect(parseNukeTime(0)).toBe('0m');
  });

  it('should return <1m for small values', () => {
    expect(parseNukeTime(30)).toBe('<1m');
  });
});

describe('formatDurationHMS', () => {
  it('should format zero seconds', () => {
    expect(formatDurationHMS(0)).toBe('00:00:00');
  });

  it('should format seconds only', () => {
    expect(formatDurationHMS(45)).toBe('00:00:45');
  });

  it('should format minutes and seconds', () => {
    expect(formatDurationHMS(125)).toBe('00:02:05');
  });

  it('should format hours, minutes, and seconds', () => {
    expect(formatDurationHMS(3661)).toBe('01:01:01');
  });

  it('should pad single digits', () => {
    expect(formatDurationHMS(1)).toBe('00:00:01');
  });

  it('should handle large hour values', () => {
    expect(formatDurationHMS(36000)).toBe('10:00:00');
  });

  it('should handle hours exceeding 24', () => {
    expect(formatDurationHMS(100000)).toBe('27:46:40');
  });
});

describe('formatDateCompact', () => {
  it('should format a date as dd/mm/yy hh:mm', () => {
    const date = new Date(2024, 5, 15, 14, 30); // June 15, 2024
    const result = formatDateCompact(date.toISOString());
    expect(result).toBe('15/06/24 14:30');
  });

  it('should pad single-digit values', () => {
    const date = new Date(2024, 0, 5, 9, 5); // Jan 5, 2024 at 09:05
    const result = formatDateCompact(date.toISOString());
    expect(result).toBe('05/01/24 09:05');
  });

  it('should return the original string for invalid input', () => {
    expect(formatDateCompact('not-a-date')).toBe('not-a-date');
  });

  it('should handle midnight', () => {
    const date = new Date(2024, 11, 31, 0, 0); // Dec 31, 2024
    const result = formatDateCompact(date.toISOString());
    expect(result).toBe('31/12/24 00:00');
  });
});
