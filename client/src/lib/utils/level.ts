import type { LevelEnum as LevelModel } from '$lib/models.gen';

export type Level = 1 | 2 | 3;

export function getEnumVariant(level: LevelModel) {
  if (typeof level == 'string') {
    return level;
  }

  console.log('level:', level, typeof level);

  return (
    Object.entries(level ?? {}).filter(([k, v]) => v != undefined)?.[0]?.[0] ??
    undefined
  );
}

export function fromDojoLevel(level: LevelModel): Level {
  switch (getEnumVariant(level)) {
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
