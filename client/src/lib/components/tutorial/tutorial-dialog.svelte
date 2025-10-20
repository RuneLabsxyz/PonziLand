<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { tutorialState, nextStep } from './stores.svelte';
  import dialogData from './dialog.json';
  import { onMount } from 'svelte';

  let currentDialog = $derived(dialogData[tutorialState.tutorialStep - 1]);

  onMount(() => {
    tutorialState.tutorialStep = 1;
    setTimeout(() => {
      nextStep();
    }, 5000);
  });
</script>

<div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
  <Card>
    <div
      class="flex items-center gap-2 w-[400px] h-[200px] p-4 font-ponzi-number"
    >
      {#if currentDialog}
        <div class="w-32 flex-shrink-0">
          <img
            src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
            alt="Ponzi Worker"
            class="h-full w-full object-contain"
          />
        </div>
        <div class="text-sm">
          {@html currentDialog.text}
        </div>
      {/if}
    </div>
  </Card>
</div>
