import { browser } from '$app/environment';
import { init } from '@dojoengine/sdk';
import { error } from '@sveltejs/kit';

export const webGLStateStore = $state({
  initialized: false,
  hasError: false,
  errorMessage: '',
});

export const initializeWebGL = () => {
  if (!browser) return;

  if (webGLStateStore.initialized) return;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
  } catch (e) {
    console.error(e);
    webGLStateStore.hasError = true;
    webGLStateStore.errorMessage =
      e instanceof Error
        ? e.message
        : 'Unknown error during WebGL initialization';
  }
  webGLStateStore.initialized = true;
};
