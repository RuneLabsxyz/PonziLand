<script lang="ts">
  import { useThrelte } from '@threlte/core';
  import { interactivity } from '@threlte/extras';
  import LandSprite from '../+game-map/three/land-sprite.svelte';
  import type { TutorialLandStore } from './tutorial-land-store';

  interface Props {
    tutorialLandStore: TutorialLandStore;
  }

  let { tutorialLandStore }: Props = $props();

  const { renderer } = useThrelte();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = 1; // No tone mapping

  interactivity({
    filter: (hits) => {
      // Only return the first hit
      return hits.slice(0, 1);
    },
  });
</script>

<LandSprite store={tutorialLandStore} />
