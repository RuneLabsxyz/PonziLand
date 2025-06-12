<script lang="ts">
  import { settingsStore } from '$lib/stores/settings.store.svelte';
  import { Slider } from '$lib/components/ui/slider';
  import { Label } from '$lib/components/ui/label';
  import { Volume2, VolumeX } from 'lucide-svelte';
  import { widgetsStore } from '$lib/stores/widgets.store';
</script>

<div class="flex flex-col gap-4 p-5">
  <!-- Volume Slider -->
  <div class="flex flex-col gap-2 p-2">
    <div class="flex items-center justify-between">
      <Label for="volume-slider" class="font-medium">SFX Volume</Label>
      <span class="text-sm text-muted-foreground">{settingsStore.volume}%</span>
    </div>
    <Slider
      type="single"
      id="volume-slider"
      value={settingsStore.volume}
      onValueChange={(value) => settingsStore.setVolume(value)}
      max={100}
      min={0}
      step={1}
      class="w-full"
    />
  </div>
  <div class="flex justify-evenly">
    <!-- Pro / Noob mode Button -->
    <button
      class="w-full justify-center flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
      onclick={() => settingsStore.toggleNoobMode()}
    >
      {#if settingsStore.isNoobMode}
        <Label class="font-medium cursor-pointer">Pro Mode</Label>
      {:else}
        <Label class="font-medium cursor-pointer">Noob Mode</Label>
      {/if}
    </button>

    <!-- Reset UI Button -->
    <button
      class="w-full justify-center flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
      onclick={() => widgetsStore.resetToDefault()}
    >
      <Label class="font-medium cursor-pointer">Reset UI</Label>
    </button>
  </div>
</div>
