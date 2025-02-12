import type { Level } from '$lib/api/land.svelte';
import type { LevelEnum as LevelModel } from '$lib/models.gen';

export function fromDojoLevel(level: LevelModel): Level | undefined {
  return (
    (Object.entries(level ?? {}).filter(
      ([k, v]) => v != undefined,
    )?.[0]?.[0] as Level) ?? undefined
  );
}
