<script>
  import SpriteSheet from '$lib/components/ui/sprite-sheet.svelte';
</script>

<SpriteSheet
  src="/land-display/nuke-animation.png"
  xSize={350}
  ySize={350}
  xMax={1750}
  yMax={2450}
  width={32}
  height={32}
  animate={true}
  frameDelay={90}
  startFrame={0}
  endFrame={35}
  loop={false}
  horizontal={true}
  autoplay={true}
/>
