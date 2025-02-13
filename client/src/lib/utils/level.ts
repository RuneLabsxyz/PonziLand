import type { Level } from '$lib/api/land.svelte';
import type { LevelEnum as LevelModel } from '$lib/models.gen';

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
    case 'None':
      return 0;
    case 'First':
      return 1;
    case 'Second':
      return 2;
    default:
      return 0;
  }
}
