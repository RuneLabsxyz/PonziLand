import type { LevelEnum as LevelModel } from '$lib/models.gen';

export type Level = 1 | 2 | 3;

export function getEnumVariant(level: LevelModel): string {
  console.log('getenumvariant', level);

  // If level is a string, return it directly
  if (typeof level === 'string') {
    return level;
  }

  // If level is a number, convert to string variant
  if (typeof level === 'number') {
    switch (level) {
      case 1:
        return 'Zero';
      case 2:
        return 'First';
      case 3:
        return 'Second';
      default:
        return 'Zero';
    }
  }

  // If level is an object, try to get variant or activeVariant
  if (level && typeof level === 'object') {
    // First try to get variant property
    if (level.variant) {
      return level.variant;
    }
    // Then try activeVariant
    if (level.activeVariant) {
      return level.activeVariant;
    }
    // Fallback to the original logic for other object structures
    return (
      Object.entries(level ?? {}).filter(
        ([_, v]) => v != undefined,
      )?.[0]?.[0] ?? 'Zero'
    );
  }

  return 'Zero';
}

export function fromDojoLevel(level: LevelModel): Level {
  const enumVariant = getEnumVariant(level);
  console.log('from dojo level', enumVariant);

  switch (enumVariant) {
    case 'Zero':
      return 1;
    case 'First':
      return 2;
    case 'Second':
      return 3;
    default:
      return 1;
  }
}
