<script lang="ts">
  import { gameStore } from '../+game-map/three/game.store.svelte';
  import { onMount } from 'svelte';
  import { Card } from './card';

  let currentZoom = $state(100);
  let minZoom = 50;
  let maxZoom = 300; // Reduced max for better mobile performance

  // Update zoom when slider changes
  function handleZoomChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const zoomValue = parseFloat(target.value);
    currentZoom = zoomValue;

    if (gameStore.cameraControls) {
      gameStore.cameraControls.zoomTo(zoomValue, true);
    }
  }

  // Listen to camera zoom changes
  onMount(() => {
    const updateZoomFromCamera = () => {
      if (gameStore.cameraControls?.camera) {
        const cam = gameStore.cameraControls.camera;
        currentZoom = cam.zoom || 100;
      }
    };

    // Check for camera controls
    const checkForControls = () => {
      if (gameStore.cameraControls) {
        // Set initial zoom
        updateZoomFromCamera();

        // Listen for zoom updates
        gameStore.cameraControls.addEventListener(
          'update',
          updateZoomFromCamera,
        );
      } else {
        // Check again in a bit if controls aren't ready yet
        setTimeout(checkForControls, 100);
      }
    };

    checkForControls();

    return () => {
      if (gameStore.cameraControls) {
        gameStore.cameraControls.removeEventListener(
          'update',
          updateZoomFromCamera,
        );
      }
    };
  });

  // Quick zoom presets
  function setZoom(zoom: number) {
    currentZoom = zoom;
    if (gameStore.cameraControls) {
      gameStore.cameraControls.zoomTo(zoom, true);
    }
  }
</script>

<Card
  class="bg-ponzi fixed bottom-20 right-2 z-40 flex flex-col items-center gap-1 p-3"
  style="pointer-events: all;"
>
  <!-- Zoom in button (moved to top) -->
  <button
    onclick={() => setZoom(Math.min(maxZoom, currentZoom + 100))}
    class="w-9 h-9 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-md transition-colors text-white"
    aria-label="Zoom in"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 4v16m8-8H4"
      />
    </svg>
  </button>

  <!-- Vertical slider -->
  <div class="relative h-24 w-8 flex items-center justify-center">
    <input
      type="range"
      min={minZoom}
      max={maxZoom}
      value={currentZoom}
      oninput={handleZoomChange}
      class="zoom-slider"
      aria-label="Zoom level"
      style="writing-mode: vertical-lr; direction: rtl;"
    />
  </div>

  <!-- Zoom out button -->
  <button
    onclick={() => setZoom(Math.max(minZoom, currentZoom - 100))}
    class="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-md transition-colors text-white"
    aria-label="Zoom out"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="w-4 h-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M20 12H4"
      />
    </svg>
  </button>

  <!-- Zoom percentage display -->
  <div class="text-[10px] text-white/60 font-ponzi-number mt-1">
    {Math.round((currentZoom / 100) * 100)}%
  </div>
</Card>

<style>
  .zoom-slider {
    -webkit-appearance: slider-vertical;
    appearance: slider-vertical;
    width: 24px;
    height: 90px;
    background: transparent;
    outline: none;
    cursor: pointer;
  }

  .zoom-slider::-webkit-slider-track {
    width: 3px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .zoom-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #facc15;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .zoom-slider::-webkit-slider-thumb:hover {
    background: #fbbf24;
    transform: scale(1.1);
  }

  .zoom-slider::-moz-range-track {
    width: 3px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .zoom-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #facc15;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  .zoom-slider::-moz-range-thumb:hover {
    background: #fbbf24;
    transform: scale(1.1);
  }
</style>
