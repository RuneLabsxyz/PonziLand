<script>
  import SpriteSheet from '../ui/sprite-sheet.svelte';
</script>

<SpriteSheet
  src="/sheets/explosion.png"
  xSize={320}
  ySize={232}
  xMax={1600}
  yMax={1163}
  width={32}
  height={32}
  animate={true}
  frameDelay={120}
  startFrame={0}
  endFrame={24}
  loop={false}
  horizontal={false}
  autoplay={true}
/>
