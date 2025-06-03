<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip';
  import { cn } from '$lib/utils';

  let {
    estimatedNukeTime,
    class: ClassName = '',
    lockTime = false,
  }: {
    estimatedNukeTime: number;
    class?: string;
    lockTime?: boolean;
  } = $props();

  let estimatedDays = $derived(Math.floor(estimatedNukeTime / 60 / 60 / 24));
  let estimatedDaysString = $derived.by(() => {
    if (estimatedNukeTime <= 0) {
      return '💀'; // Or any indicator for nuked state
    }
    if (estimatedDays === Infinity) {
      return '∞';
    } else if (estimatedDays > 365) {
      return '365+';
    }
    return estimatedDays.toString();
  });

  let estimatedTimeString = $derived.by(() => {
    // Convert estimatedNukeTime to a human-readable string
    if (estimatedNukeTime === Infinity) return 'no neighbors = no tax';
    if (estimatedNukeTime <= 0) return 'NUKABLE !';
    const days = Math.floor(estimatedNukeTime / 60 / 60 / 24);
    const hours = Math.floor((estimatedNukeTime / 60 / 60) % 24);
    const minutes = Math.floor((estimatedNukeTime / 60) % 60);
    const seconds = Math.floor(estimatedNukeTime % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  });

  let estimatedNukeDate = $derived.by(() => {
    const time = estimatedNukeTime;
    const date = new Date();
    date.setSeconds(date.getSeconds() + time);
    return date.toLocaleString();
  });

  // Check if nuke time has passed
  let isNuked = $derived(estimatedNukeTime <= 0);

  // Define thresholds with corresponding background images
  const thresholds: { [key: number]: { image: string; color: string } } = {
    7: {
      image: 'url(/ui/icons/Icon_ShieldBlue.png)',
      color: '#DFDFE3',
    },
    5: {
      image: 'url(/ui/icons/Icon_ShieldGrey.png)',
      color: '#DFDFE3',
    },
    3: {
      image: 'url(/ui/icons/Icon_ShieldYellow.png)',
      color: '#F2B545',
    },
    2: {
      image: 'url(/ui/icons/Icon_ShieldOrange.png)',
      color: '#F27345',
    },
    1: { image: 'url(/ui/icons/Icon_ShieldRed.png)', color: '#ED3939' },
  };

  // Determine the appropriate background image based on estimatedNukeTime
  function getStyle(time: number) {
    let selectedStyle = {
      image: 'url(/ui/icons/Icon_ShieldRed.png)',
      color: '#ED3939',
    }; // Default style
    for (const [days, style] of Object.entries(thresholds)) {
      if (time >= Number(days)) {
        selectedStyle = style;
      }
    }
    return selectedStyle;
  }

  $effect(() => {
    // trigger interval to update estimatedTimeString every seconds
    if (lockTime) return;
    const interval = setInterval(() => {
      estimatedNukeTime -= 1;
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#if isNuked}
      <!-- Nuclear explosion icon when nuked -->
      <div
        class={cn(
          'nuke-shield h-2 w-2 flex items-center justify-center leading-none nuclear-icon',
          ClassName,
        )}
        style="color: #FF0000;"
      >
        <img
          style="image-rendering: pixelated;"
          src="/extra/nuke.png"
          alt="Nuclear Explosion Icon"
        />
      </div>
    {:else}
      <!-- Shield icon when not nuked -->
      <div
        class={cn(
          'nuke-shield h-2 w-2 flex items-center justify-center leading-none',
          ClassName,
        )}
        style="background-image: {getStyle(estimatedDays)
          .image}; color: {getStyle(estimatedDays).color}"
      >
        {estimatedDaysString}
      </div>
    {/if}
  </Tooltip.Trigger>
  <Tooltip.Content
    class="border-ponzi bg-ponzi text-ponzi flex gap-2 items-center justify-center"
  >
    <div class="flex flex-col">
      <span>
        <span class="opacity-50"> Estimated nuke date: </span>
        <span>{estimatedNukeDate}</span>
      </span>
      <span>
        <span class="opacity-50">in</span>
        {estimatedTimeString}
      </span>
    </div>
    <a
      href="https://docs.ponzi.land/docs/%E2%9A%99%EF%B8%8F%20Mechanics/nukeing"
      rel="noopener noreferrer"
      target="_blank"
      class="cursor-pointer h-6 w-6"
      ><img src="/ui/icons/Icon_Help.png" alt="info" /></a
    >
  </Tooltip.Content>
</Tooltip.Root>

<style>
  .nuke-shield {
    font-size: 0.8em;
    background-size: cover;
    background-position: center;
    font-family: 'PonziNumber';
    -webkit-text-stroke: 0.25em black;
    paint-order: stroke fill;
  }

  .nuclear-icon {
    background-image: none !important;
    -webkit-text-stroke: none;
    paint-order: normal;
  }
</style>
