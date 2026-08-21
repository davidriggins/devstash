const FILE_SIZE_UNITS = ["B", "KB", "MB", "GB"] as const;

/**
 * A byte count as something a person reads, e.g. `1.5 KB`.
 *
 * One decimal below 10 and none at or above it, so the number stays about as
 * wide whatever the size — except in bytes, where a fraction would be a lie.
 * Sizes past the largest unit keep counting in it: 2 TB reads as `2048 GB`
 * rather than inventing a unit the table does not have.
 */
export function formatFileSize(bytes: number): string {
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < FILE_SIZE_UNITS.length - 1) {
    size /= 1024;
    unit += 1;
  }

  const rounded = size >= 10 || unit === 0 ? Math.round(size) : size.toFixed(1);

  return `${rounded} ${FILE_SIZE_UNITS[unit]}`;
}
