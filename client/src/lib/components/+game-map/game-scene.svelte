<script lang="ts">
  import { useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import LandSprite from './three/land-sprite.svelte';
  export let billboarding = false;

  const { renderer } = useThrelte();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = 1; // No tone mapping

  interactivity();
</script>

<slot />
<LandSprite {billboarding} />
