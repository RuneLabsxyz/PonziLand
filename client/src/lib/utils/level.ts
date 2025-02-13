import type { Level } from '$lib/api/land.svelte';
import type { LevelEnum as LevelModel } from '$lib/models.gen';

export function fromDojoLevel(level: LevelModel): Level | undefined {
  if (typeof level == 'string') {
    return level as Level;
  }

  console.log('level:', level, typeof level);

  return (
    (Object.entries(level ?? {}).filter(
      ([k, v]) => v != undefined,
    )?.[0]?.[0] as Level) ?? undefined
  );
}
