<script lang="ts">
  import Card from './card/card.svelte';
  import { proMode } from '$lib/stores/ui.store.svelte';
</script>

<Card>
  <button
    class="flex items-center gap-3 px-4 py-2 rounded-lg"
    onclick={() => proMode.toggle()}
  >
    <div
      class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out
    {proMode.isProMode ? 'bg-orange-500' : 'bg-orange-500/25'}"
    >
      <span class="sr-only"
        >{proMode.isProMode ? 'Pro Mode: On' : 'Pro Mode: Off'}</span
      >
      <span
        class="inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ease-in-out
      {proMode.isProMode ? 'translate-x-6' : 'translate-x-1'}"
      />
    </div>
    <span class="text-sm font-medium w-[85px]"
      >Pro Mode {proMode.isProMode ? 'On' : 'Off'}</span
    >
  </button>
</Card>
