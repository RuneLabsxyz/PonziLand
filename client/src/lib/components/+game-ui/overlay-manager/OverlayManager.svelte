<script lang="ts">
  import { devsettings } from '$lib/components/+game-map/three/utils/devsettings.store.svelte.js';
</script>

<div
  class="top-0 left-1/2 -translate-x-1/2 absolute z-50 p-4"
  style="pointer-events: all;"
>
  <div class="flex gap-2">
    <button
      class="px-3 py-1 text-sm bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
      onclick={() => (devsettings.showNukeTimes = !devsettings.showNukeTimes)}
    >
      Nuke Times: {devsettings.showNukeTimes ? 'ON' : 'OFF'}
    </button>
    <div>toggle-two</div>
  </div>
</div>
