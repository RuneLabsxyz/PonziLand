<script lang="ts">
  import type { LevelInfo } from '$lib/api/land';
  import { Progress } from '$lib/components/ui/progress';
  import { configValues } from '$lib/stores/config.svelte';
  import { cn } from '$lib/utils';

  let { levelUpInfo, class: className } = $props<{
    levelUpInfo: LevelInfo;
    class: string;
  }>();

  let remainingTime = $derived.by(() => {
    const time =
      (levelUpInfo.levelUpTime - levelUpInfo.timeSinceLastLevelUp) /
      configValues.gameSpeed;
    console.log('Game speed:', configValues.gameSpeed);
    if (time <= 0) {
      return 'ready';
    }

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
    class={cn(className, 'absolute top-0 left-0 h-5  bg-[#fff2]')}
    color={levelUpInfo.canLevelUp ? 'green' : '#F2B445'}
  ></Progress>
  <div
    class="text-xs font-ponzi-number absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full text-center stroke-3d-black -mt-[2px]"
  >
    {remainingTime}
  </div>
</div>
