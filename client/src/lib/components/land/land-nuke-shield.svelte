<script lang="ts">
  import * as Tooltip from '$lib/components/ui/tooltip';

  let { estimatedNukeTime }: { estimatedNukeTime: number } = $props();

  let estimatedDays = Math.floor(estimatedNukeTime / 60 / 60 / 24);
  let estimatedTimeString = $derived.by(() => {
    // Convert estimatedNukeTime to a human-readable string
    if (estimatedNukeTime < 0) return 'N/A';
    const days = Math.floor(estimatedNukeTime / 60 / 60 / 24);
    const hours = Math.floor((estimatedNukeTime / 60 / 60) % 24);
    const minutes = Math.floor((estimatedNukeTime / 60) % 60);
    const seconds = Math.floor(estimatedNukeTime % 60);
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  });

  // Define thresholds with corresponding background images
  const thresholds: { [key: number]: { image: string; color: string } } = {
    7: {
      image: 'url(/assets/ui/icons/Icon_ShieldBlue.png)',
      color: '#DFDFE3',
    },
    5: {
      image: 'url(/assets/ui/icons/Icon_ShieldGrey.png)',
      color: '#DFDFE3',
    },
    3: {
      image: 'url(/assets/ui/icons/Icon_ShieldYellow.png)',
      color: '#F2B545',
    },
    2: {
      image: 'url(/assets/ui/icons/Icon_ShieldOrange.png)',
      color: '#F27345',
    },
    1: { image: 'url(/assets/ui/icons/Icon_ShieldRed.png)', color: '#ED3939' },
  };

  // Determine the appropriate background image based on estimatedNukeTime
  function getStyle(time: number) {
    let selectedStyle = {
      image: 'url(/assets/ui/icons/Icon_ShieldRed.png)',
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
    const interval = setInterval(() => {
      estimatedNukeTime -= 1;
    }, 1000);

    return () => clearInterval(interval);
  });
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    <div
      class="nuke-shield h-2 w-2 flex items-center justify-center leading-none"
      style="background-image: {getStyle(estimatedDays)
        .image}; color: {getStyle(estimatedDays).color}"
    >
      {estimatedDays}
    </div>
  </Tooltip.Trigger>
  <Tooltip.Content class="border-ponzi bg-ponzi text-ponzi"
    >{estimatedTimeString}</Tooltip.Content
  >
</Tooltip.Root>

<style>
  .nuke-shield {
    font-size: 0.8em;
    background-size: cover;
    background-position: center;
    font-family: 'PonziNumberV2';
    text-shadow: 0em 0.1em 0 black;
    -webkit-text-stroke: 0.25em black;
    paint-order: stroke fill;
  }
</style>
