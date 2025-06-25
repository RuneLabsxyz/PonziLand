<script lang="ts">
  import { useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import LandSprite from './three/land-sprite.svelte';

  const { renderer } = useThrelte();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = 1; // No tone mapping

  interactivity({
    filter: (hits, state) => {
      // Only return the first hit
      return hits.slice(0, 1);
    },
  });
</script>

<slot />
<LandSprite />
