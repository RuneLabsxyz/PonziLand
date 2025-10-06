import type { GameLoadingPhases } from '$lib/stores/loading.store.svelte';

export function getCurrentLoadingPhase(phases: GameLoadingPhases): string {
  if (phases.webgl.loaded < phases.webgl.total) {
    if (phases.webgl.loaded === 0) {
      return 'Initializing WebGL...';
    } else if (
      phases.webgl.items['webgl-init'] &&
      !phases.webgl.items['sprite-outline-shader']
    ) {
      return 'Compiling shaders...';
    } else if (
      phases.webgl.items['sprite-outline-shader'] &&
      !phases.webgl.items['shader-compilation']
    ) {
      return 'Finalizing graphics...';
    }
  } else if (phases.spritesheets.loaded < phases.spritesheets.total) {
    return `Loading assets (${phases.spritesheets.loaded}/${phases.spritesheets.total})...`;
  } else if (phases.client.loaded < phases.client.total) {
    return 'Setting up client...';
  } else if (phases.config.loaded < phases.config.total) {
    return 'Loading game configuration...';
  } else if (
    phases.wallet.loaded < phases.wallet.total &&
    phases.wallet.total > 0
  ) {
    if (!phases.wallet.items['wallet-connect']) {
      return 'Connecting wallet...';
    } else if (!phases.wallet.items['account-setup']) {
      return 'Setting up account...';
    } else if (!phases.wallet.items['token-prices']) {
      return 'Loading wallet data...';
    }
  } else if (phases.dojo.loaded < phases.dojo.total && phases.dojo.total > 0) {
    if (!phases.dojo.items['dojo-init']) {
      return 'Initializing game engine...';
    } else if (!phases.dojo.items['dojo-subscriptions']) {
      return 'Setting up subscriptions...';
    }
  } else if (
    phases.social.loaded < phases.social.total &&
    phases.social.total > 0
  ) {
    return 'Loading social data...';
  } else if (
    phases.landStore.loaded < phases.landStore.total &&
    phases.landStore.total > 0
  ) {
    return 'Loading game data...';
  } else if (phases.rendering.loaded < phases.rendering.total) {
    if (!phases.rendering.items['canvas-ready']) {
      return 'Preparing canvas...';
    } else if (!phases.rendering.items['first-frame']) {
      return 'Rendering first frame...';
    } else if (!phases.rendering.items['scene-loaded']) {
      return 'Loading game scene...';
    }
  }

  return 'Almost ready...';
}
