<script lang="ts">
  import { loadingStore } from '$lib/stores/loading.store.svelte';
</script>

<!-- 3D Assets Loading Progress Bars -->
<div class="flex flex-col gap-2 items-center text-white text-sm opacity-80">
  <div class="flex gap-2 items-center">
    <span
      >Spritesheets: {Math.round(loadingStore.spritesheetProgress * 100)}%</span
    >
    <div class="w-20 h-1 bg-gray-700 rounded">
      <div
        class="h-full bg-blue-400 rounded transition-all duration-300"
        style="width: {loadingStore.spritesheetProgress * 100}%"
      ></div>
    </div>
  </div>

  <div class="flex gap-2 items-center">
    <span>Assets: {Math.round(loadingStore.assetProgress * 100)}%</span>
    <div class="w-20 h-1 bg-gray-700 rounded">
      <div
        class="h-full bg-green-400 rounded transition-all duration-300"
        style="width: {loadingStore.assetProgress * 100}%"
      ></div>
    </div>
  </div>

  <div class="text-xs opacity-60">
    3D Assets: {loadingStore.spritesheets.loaded +
      loadingStore.assets.loaded}/{loadingStore.spritesheets.total +
      loadingStore.assets.total}
  </div>
</div>
