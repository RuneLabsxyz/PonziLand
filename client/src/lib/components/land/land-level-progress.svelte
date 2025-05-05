<script lang="ts">
  import type { LevelInfo } from '$lib/api/land.svelte';
  import { cn } from '$lib/utils';
  import { Progress } from '../ui/progress';

  let { levelUpInfo, class: className } = $props<{
    levelUpInfo: LevelInfo;
    class: string;
  }>();

  let remainingTime = $derived.by(() => {
    const time =
      (levelUpInfo.levelUpTime - levelUpInfo.timeSinceLastLevelUp) / 20;
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;

    return `${hours}h ${minutes}m ${seconds}s`;
  });
</script>

<div class="relative w-full h-6">
  <Progress
    value={levelUpInfo.timeSinceLastLevelUp}
    max={levelUpInfo.levelUpTime}
    class={cn(className, 'absolute top-0 left-0 h-6  bg-white')}
    color={levelUpInfo.canLevelUp ? 'green' : undefined}
  ></Progress>
  <div class="font-[PonziNumber] text-sm absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center">
    {remainingTime}
  </div>
</div>
