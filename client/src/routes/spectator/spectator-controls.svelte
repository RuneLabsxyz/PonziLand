<script lang="ts">
  import { replayStore } from '$lib/spectator/replay-store.svelte';
  import { SPEED_OPTIONS, REPLAY_PRESETS } from '$lib/spectator/replay-engine';
  import { formatDateOnly, formatTimeOnly } from '$lib/utils/date';

  let progressInput = $state(0);
  let isDragging = $state(false);

  // Sync progress when not dragging
  $effect(() => {
    if (!isDragging) {
      progressInput = replayStore.progress * 100;
    }
  });

  function handleProgressInput(e: Event) {
    const target = e.target as HTMLInputElement;
    progressInput = parseFloat(target.value);
  }

  function handleProgressChange() {
    replayStore.seek(progressInput / 100);
    isDragging = false;
  }

  function handleProgressStart() {
    isDragging = true;
    replayStore.pause();
  }

  function formatDuration(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }
</script>

<div
  class="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/95 border border-amber-500/30 rounded-lg p-4 shadow-xl backdrop-blur-sm z-50"
>
  <!-- Current time display -->
  <div class="text-center text-amber-400 mb-3 font-mono">
    {#if replayStore.currentTime}
      <div class="text-lg font-bold">
        {formatDateOnly(replayStore.currentTime.toISOString())}
      </div>
      <div class="text-sm text-amber-300/80">
        {formatTimeOnly(replayStore.currentTime.toISOString())}
      </div>
    {:else}
      <div class="text-lg">--:--:--</div>
    {/if}
  </div>

  <!-- Progress bar / scrubber -->
  <div class="mb-4 px-2">
    <input
      type="range"
      min="0"
      max="100"
      step="0.1"
      value={progressInput}
      oninput={handleProgressInput}
      onmousedown={handleProgressStart}
      ontouchstart={handleProgressStart}
      onchange={handleProgressChange}
      class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
    />
    <div class="flex justify-between text-xs text-gray-400 mt-1">
      <span
        >{replayStore.startTime
          ? formatTimeOnly(replayStore.startTime.toISOString())
          : '--:--'}</span
      >
      <span class="text-amber-400"
        >{formatDuration(
          replayStore.totalDuration * replayStore.progress,
        )}</span
      >
      <span
        >{replayStore.endTime
          ? formatTimeOnly(replayStore.endTime.toISOString())
          : '--:--'}</span
      >
    </div>
  </div>

  <!-- Playback controls -->
  <div class="flex gap-3 justify-center items-center mb-3">
    <!-- Reset button -->
    <button
      onclick={() => replayStore.reset()}
      class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors"
      title="Reset to start"
      aria-label="Reset to start"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <!-- Slow down button -->
    <button
      onclick={() => replayStore.slowDown()}
      class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
      disabled={replayStore.speedIndex === 0}
      title="Slower"
      aria-label="Slower playback"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <!-- Play/Pause button -->
    <button
      onclick={() => replayStore.togglePlay()}
      class="p-3 rounded-full bg-amber-500 hover:bg-amber-400 text-black transition-colors"
      title={replayStore.isPlaying ? 'Pause' : 'Play'}
    >
      {#if replayStore.isPlaying}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
            clip-rule="evenodd"
          />
        </svg>
      {:else}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
            clip-rule="evenodd"
          />
        </svg>
      {/if}
    </button>

    <!-- Speed up button -->
    <button
      onclick={() => replayStore.speedUp()}
      class="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors disabled:opacity-50"
      disabled={replayStore.speedIndex === SPEED_OPTIONS.length - 1}
      title="Faster"
      aria-label="Faster playback"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-5 w-5"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fill-rule="evenodd"
          d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
          clip-rule="evenodd"
        />
      </svg>
    </button>

    <!-- Speed display -->
    <div
      class="px-3 py-1 rounded-lg bg-gray-700 text-amber-400 font-mono text-sm min-w-[50px] text-center"
    >
      {replayStore.speedLabel}
    </div>
  </div>

  <!-- Speed presets -->
  <div class="flex gap-2 justify-center">
    {#each SPEED_OPTIONS as option, index}
      <button
        onclick={() => replayStore.setSpeed(index)}
        class={[
          'px-2 py-1 rounded text-xs transition-colors',
          {
            'bg-amber-500 text-black': replayStore.speedIndex === index,
            'bg-gray-700 text-gray-300 hover:bg-gray-600':
              replayStore.speedIndex !== index,
          },
        ]}
      >
        {option.label}
      </button>
    {/each}
  </div>
</div>
