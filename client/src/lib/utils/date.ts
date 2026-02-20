/**
 * Centralized date utility functions for PonziLand
 */

/**
 * Format a date string to a human-readable format with date and time
 */
export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to show only the date portion
 */
export function formatDateOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Format a date string to show only the time portion
 */
export function formatTimeOnly(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

/**
 * Calculate and format the duration between two dates in a human-readable format
 */
export function formatDuration(startDate: string, endDate: string): string {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '-';

    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(
      (diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    const parts = [];
    if (diffDays > 0) parts.push(`${diffDays}d`);
    if (diffHours > 0) parts.push(`${diffHours}h`);
    if (diffMinutes > 0) parts.push(`${diffMinutes}m`);

    return parts.length > 0 ? parts.join(' ') : '<1m';
  } catch {
    return '-';
  }
}

/**
 * Calculate the duration from a start date to now
 */
export function formatDurationFromNow(startDate: string): string {
  return formatDuration(startDate, new Date().toISOString());
}

/**
 * Check if a date string represents a valid date
 */
export function isValidDate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  } catch {
    return false;
  }
}

/**
 * Format timestamp to match the display format: YYYY/MM/DD at HH:MM
 */
export function formatTimestamp(timestamp: Date): string {
  const year = timestamp.getFullYear();
  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
  const day = String(timestamp.getDate()).padStart(2, '0');
  const hours = String(timestamp.getHours()).padStart(2, '0');
  const minutes = String(timestamp.getMinutes()).padStart(2, '0');

  return `${year}/${month}/${day} at ${hours}:${minutes}`;
}

/**
 * Format timestamp in relative terms (e.g., "2 hours ago", "just now")
 */
export function formatTimestampRelative(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) {
    return 'just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
}

/**
 * Parse seconds into time components (days, hours, minutes)
 */
export function parseNukeTimeComponents(timeInSeconds: number): {
  days: number;
  hours: number;
  minutes: number;
  toString: () => string;
} {
  if (timeInSeconds <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      toString: () => '0m',
    };
  }

  const days = Math.floor(timeInSeconds / 86400);
  const hours = Math.floor((timeInSeconds % 86400) / 3600);
  const minutes = Math.floor((timeInSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return {
    days,
    hours,
    minutes,
    toString: () => (parts.length > 0 ? parts.join(' ') : '<1m'),
  };
}

/**
 * Parse seconds into formatted time with days, hours, minutes (nuke time format)
 */
export function parseNukeTime(timeInSeconds: number): string {
  return parseNukeTimeComponents(timeInSeconds).toString();
}

/**
 * Format duration as HH:MM:SS for countdown displays
 */
export function formatDurationHMS(durationInSeconds: number): string {
  const hours = Math.floor(durationInSeconds / 3600);
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Format a date string to dd/mm/yy hh:mm format
 */
export function formatDateCompact(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
}
