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
