<script lang="ts">
  let { estimatedNukeTime }: { estimatedNukeTime: number } = $props();

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
</script>

<div
  class="nuke-shield h-2 w-2 flex items-center justify-center leading-none"
  style="background-image: {getStyle(estimatedNukeTime)
    .image}; color: {getStyle(estimatedNukeTime).color}"
>
  {estimatedNukeTime}
</div>

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
