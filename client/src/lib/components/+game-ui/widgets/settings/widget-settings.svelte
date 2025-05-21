<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.store.svelte';
</script>

<div class="flex flex-col gap-2">
  <div class="flex items-center justify-between p-2">
    <button
      class="flex items-center gap-3 px-4 py-2 rounded-lg"
      onclick={() => settingsStore.toggleProMode()}
    >
      <div
        class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
          {settingsStore.isProMode ? 'bg-orange-500' : 'bg-orange-500/25'}"
      >
        <span class="sr-only"
          >{settingsStore.isProMode ? 'Pro Mode: On' : 'Pro Mode: Off'}</span
        >
        <span
          class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out
            {settingsStore.isProMode ? 'translate-x-6' : 'translate-x-1'}"
        ></span>
      </div>
      <span class="text-sm font-medium w-[85px]">Pro Mode</span>
    </button>
  </div>
</div>
