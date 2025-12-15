<script lang="ts">
  import WebGLError from '$lib/components/loading-screen/webgl-error.svelte';
  import { onMount, onDestroy } from 'svelte';
  import { initializeWebGL, webGLStateStore } from '$lib/utils/webgl.svelte';
  import LoadingScreen from '$lib/components/loading-screen/loading-screen.svelte';
  import GameCanva from '$lib/components/+game-map/game-canva.svelte';
  import { loadingStore } from '$lib/stores/loading.store.svelte';
  import { setSpectatorMode } from '$lib/account.svelte';
  import { replayStore } from '$lib/spectator/replay-store.svelte';
  import {
    initializeReplay,
    formatDateForAPI,
    getDefaultTimeRange,
  } from '$lib/spectator/spectator.service';
  import {
    REPLAY_PRESETS,
    type ReplayPreset,
  } from '$lib/spectator/replay-engine';
  import SpectatorControls from './spectator-controls.svelte';
  import { page } from '$app/stores';

  let webglShow = $derived(webGLStateStore.hasError);
  let webglError = $derived(webGLStateStore.errorMessage);
  let loading = $derived(loadingStore.isLoading || replayStore.isLoading);

  // Spectator mode: only need basic loading to complete
  let gameContentReady = $derived(!loading);

  // Time range selection
  let selectedPreset = $state<ReplayPreset>('1d');
  let customStartDate = $state('');
  let customEndDate = $state('');
  let useCustomRange = $state(false);

  // Get time range from URL params or defaults
  function getTimeRangeFromParams(): { start: Date; end: Date } {
    const urlParams = new URLSearchParams($page.url.search);
    const startParam = urlParams.get('start');
    const endParam = urlParams.get('end');
    const durationParam = urlParams.get('duration') as ReplayPreset | null;

    const end = endParam ? new Date(endParam) : new Date();

    if (startParam) {
      return { start: new Date(startParam), end };
    }

    if (durationParam && REPLAY_PRESETS[durationParam]) {
      const durationMs = REPLAY_PRESETS[durationParam].durationMs;
      return { start: new Date(end.getTime() - durationMs), end };
    }

    // Default to 1 day
    const durationMs = REPLAY_PRESETS['1d'].durationMs;
    return { start: new Date(end.getTime() - durationMs), end };
  }

  async function loadSpectatorData() {
    try {
      replayStore.setLoading(true);
      replayStore.setError(null);

      let startTime: Date;
      let endTime: Date;

      if (useCustomRange && customStartDate && customEndDate) {
        startTime = new Date(customStartDate);
        endTime = new Date(customEndDate);
      } else {
        const { start, end } = getTimeRangeFromParams();
        startTime = start;
        endTime = end;
      }

      const startStr = formatDateForAPI(startTime);
      const endStr = formatDateForAPI(endTime);

      console.log(`Loading spectator data from ${startStr} to ${endStr}`);

      const { snapshot, timeline } = await initializeReplay(startStr, endStr);

      console.log(
        `Loaded ${snapshot.lands.length} lands in snapshot, ${timeline.entries.length} players in timeline`,
      );

      replayStore.initialize(snapshot, timeline, startTime, endTime);
    } catch (error) {
      console.error('Failed to load spectator data:', error);
      replayStore.setError(
        error instanceof Error ? error.message : 'Failed to load data',
      );
    } finally {
      replayStore.setLoading(false);
    }
  }

  function handlePresetChange(preset: ReplayPreset) {
    selectedPreset = preset;
    useCustomRange = false;

    const end = new Date();
    const durationMs = REPLAY_PRESETS[preset].durationMs;
    const start = new Date(end.getTime() - durationMs);

    // Reload data with new time range
    loadSpectatorData();
  }

  async function startSpectatorLoading() {
    // Enable spectator mode
    setSpectatorMode(true);
    loadingStore.setSpectatorMode(true);

    // Initialize WebGL first
    initializeWebGL();

    // Start comprehensive loading in spectator mode
    await loadingStore.startComprehensiveLoading(true);

    // Load spectator data (snapshot + timeline)
    await loadSpectatorData();
  }

  onMount(() => {
    startSpectatorLoading();
  });

  onDestroy(() => {
    // Cleanup
    replayStore.cleanup();
    setSpectatorMode(false);
  });
</script>

<!-- WebGL Error Modal -->
<WebGLError isVisible={webglShow} errorMessage={webglError} />

<div class="h-screen w-screen bg-black/10 overflow-visible relative">
  <!-- Game Canvas - Always rendered but potentially hidden -->
  {#if !webglShow && gameContentReady}
    <div class="absolute inset-0 pointer-events-none">
      <GameCanva />
    </div>

    <!-- Spectator Mode Header -->
    <div
      class="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 border border-amber-500/30 rounded-lg px-4 py-2 backdrop-blur-sm"
    >
      <div class="flex items-center gap-3">
        <span class="text-amber-400 font-bold">SPECTATOR MODE</span>
        <div class="h-4 w-px bg-gray-600"></div>

        <!-- Time range presets -->
        {#each Object.entries(REPLAY_PRESETS) as [key, preset]}
          <button
            onclick={() => handlePresetChange(key as ReplayPreset)}
            class={[
              'px-2 py-1 rounded text-sm transition-colors',
              {
                'bg-amber-500 text-black':
                  selectedPreset === key && !useCustomRange,
                'bg-gray-700 text-gray-300 hover:bg-gray-600':
                  selectedPreset !== key || useCustomRange,
              },
            ]}
          >
            {preset.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Error display -->
    {#if replayStore.error}
      <div
        class="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/30 rounded-lg px-4 py-2"
      >
        <p class="text-red-200">{replayStore.error}</p>
        <button
          onclick={loadSpectatorData}
          class="mt-2 px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-white text-sm"
        >
          Retry
        </button>
      </div>
    {/if}

    <!-- Spectator Controls -->
    {#if !replayStore.isLoading && replayStore.snapshot}
      <SpectatorControls />
    {/if}

    <!-- Stats overlay -->
    {#if replayStore.snapshot}
      <div
        class="absolute top-4 right-4 z-50 bg-gray-900/90 border border-amber-500/30 rounded-lg px-4 py-2 backdrop-blur-sm"
      >
        <div class="text-sm text-gray-300">
          <div class="flex justify-between gap-4">
            <span>Lands at start:</span>
            <span class="text-amber-400"
              >{replayStore.snapshot.lands.length}</span
            >
          </div>
          <div class="flex justify-between gap-4">
            <span>Events in replay:</span>
            <span class="text-amber-400">{replayStore.events.length}</span>
          </div>
        </div>
      </div>
    {/if}
  {/if}

  <!-- Loading Screen (overlay on top) -->
  {#if loading && !webglShow}
    <div class="absolute inset-0 z-[1000]">
      <LoadingScreen value={loadingStore.totalProgress * 100} />
    </div>
  {/if}
</div>
