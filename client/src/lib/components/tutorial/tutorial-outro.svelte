<script lang="ts">
  import { onDestroy } from 'svelte';
  import { gameStore } from '$lib/components/+game-map/three/game.store.svelte';
  import { landStore } from '$lib/stores/store.svelte';
  import { tutorialOutroState, setOutroPhase, nextStep } from './stores.svelte';
  import { TUTORIAL_OUTRO_CONFIG, TUTORIAL_COORDS } from './constants';

  // Destructure timing constants for convenience
  const {
    ZOOM_DURATION,
    ACTIVITY_DURATION,
    PAUSE_DURATION,
    SPAWN_INTERVAL,
    NUKE_INTERVAL,
    START_ZOOM,
    END_ZOOM,
    START_RADIUS,
    MAX_RADIUS,
  } = TUTORIAL_OUTRO_CONFIG;

  // Camera center coordinates
  const CENTER_X = TUTORIAL_COORDS.CENTER.x;
  const CENTER_Y = TUTORIAL_COORDS.CENTER.y;

  // Expanding ring spawning
  let currentRadius = START_RADIUS;
  let startTime = 0;

  // Track spawned lands for nuking
  let spawnedLands: { x: number; y: number }[] = [];
  let spawnIntervalId: ReturnType<typeof setInterval> | null = null;
  let nukeIntervalId: ReturnType<typeof setInterval> | null = null;
  // Track ALL phase timeouts to ensure proper cleanup on unmount
  let phaseTimeoutIds: ReturnType<typeof setTimeout>[] = [];
  let originalSmoothTime: number | null = null;

  // Helper to schedule a phase timeout and track it for cleanup
  function schedulePhaseTimeout(callback: () => void, delay: number) {
    const timeoutId = setTimeout(callback, delay);
    phaseTimeoutIds.push(timeoutId);
    return timeoutId;
  }

  // Clear all phase timeouts
  function clearAllPhaseTimeouts() {
    phaseTimeoutIds.forEach((id) => clearTimeout(id));
    phaseTimeoutIds = [];
  }

  // Watch for outro state changes
  $effect(() => {
    if (
      tutorialOutroState.isPlaying &&
      tutorialOutroState.phase === 'zooming'
    ) {
      startOutro();
    }
  });

  function startOutro() {
    console.log('Tutorial Outro: Starting cinematic sequence...');

    // Clear any existing timeouts from previous runs
    clearAllPhaseTimeouts();

    spawnedLands = [];
    currentRadius = START_RADIUS;
    startTime = Date.now();

    // Start smooth zoom animation
    startSmoothZoom();

    // Start spawning lands from center outward
    startSpawning();

    // Start occasional nuking (much less frequent)
    startNuking();

    // After zoom duration, transition to activity phase
    schedulePhaseTimeout(() => {
      restoreCameraSettings();
      setOutroPhase('activity');
      console.log('Tutorial Outro: Activity phase');

      // Continue activity for a bit longer
      schedulePhaseTimeout(() => {
        stopSpawning();
        stopNuking();
        setOutroPhase('nuking');
        console.log('Tutorial Outro: Final nuke phase');

        // Clear all lands
        landStore.clearAllTutorialLands();

        // After lands are cleared, pause then complete
        schedulePhaseTimeout(() => {
          setOutroPhase('pausing');
          console.log('Tutorial Outro: Pausing on empty map');

          schedulePhaseTimeout(() => {
            completeOutro();
          }, PAUSE_DURATION);
        }, 800); // Wait for nuke animations
      }, ACTIVITY_DURATION);
    }, ZOOM_DURATION);
  }

  function startSmoothZoom() {
    if (!gameStore.cameraControls) return;

    // Unlock zoom constraints
    gameStore.cameraControls.minZoom = END_ZOOM;
    gameStore.cameraControls.maxZoom = START_ZOOM;

    // Store original smoothTime
    originalSmoothTime = gameStore.cameraControls.smoothTime;

    // Set duration for this animation (in seconds)
    // The library uses SmoothDamp for physics-based smooth animation
    gameStore.cameraControls.smoothTime = ZOOM_DURATION / 1000;

    // Single call - library handles smooth animation via SmoothDamp
    gameStore.cameraControls.zoomTo(END_ZOOM, true);
  }

  function restoreCameraSettings() {
    if (gameStore.cameraControls && originalSmoothTime !== null) {
      gameStore.cameraControls.smoothTime = originalSmoothTime;
      originalSmoothTime = null;
    }
  }

  function startSpawning() {
    spawnIntervalId = setInterval(() => {
      // Calculate current radius based on time elapsed
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / ZOOM_DURATION, 1);

      // Expand radius as we zoom out - start at START_RADIUS, end at MAX_RADIUS
      currentRadius =
        START_RADIUS + Math.floor(progress * (MAX_RADIUS - START_RADIUS));

      // Spawn more lands as we zoom out (3-6 per interval, increasing over time)
      const baseCount = 3 + Math.floor(progress * 3);
      const count = baseCount + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const result = landStore.addTutorialOutroLandAtRadius(
          CENTER_X,
          CENTER_Y,
          currentRadius,
        );
        if (result) {
          spawnedLands.push(result);
        }
      }
    }, SPAWN_INTERVAL);
  }

  function stopSpawning() {
    if (spawnIntervalId) {
      clearInterval(spawnIntervalId);
      spawnIntervalId = null;
    }
  }

  function startNuking() {
    nukeIntervalId = setInterval(() => {
      // Only nuke occasionally and only if we have many lands
      if (spawnedLands.length > 30) {
        // Nuke just 1 land, rarely
        const randomIndex = Math.floor(Math.random() * spawnedLands.length);
        const land = spawnedLands.splice(randomIndex, 1)[0];
        landStore.nukeTutorialLand(land.x, land.y);
      }
    }, NUKE_INTERVAL);
  }

  function stopNuking() {
    if (nukeIntervalId) {
      clearInterval(nukeIntervalId);
      nukeIntervalId = null;
    }
  }

  function completeOutro() {
    console.log('Tutorial Outro: Complete');
    setOutroPhase('complete');

    // Advance to the final step (Enter the Grid)
    nextStep();
  }

  // Cleanup on destroy
  onDestroy(() => {
    stopSpawning();
    stopNuking();
    restoreCameraSettings();
    clearAllPhaseTimeouts();
  });
</script>

<!-- This component has no visual output - it just orchestrates the outro sequence -->
