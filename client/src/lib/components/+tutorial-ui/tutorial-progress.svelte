<script lang="ts">
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';

  let progress = $derived(tutorialStore.progress);
  let currentStep = $derived(tutorialStore.currentStep);
  let stepIndex = $derived(tutorialStore.currentStepIndex);
  let totalSteps = $derived(tutorialStore.steps.length);
</script>

<div
  class="absolute top-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-4"
  style="pointer-events: auto;"
>
  <div class="max-w-4xl mx-auto">
    <!-- Step Counter -->
    <div class="text-white text-sm mb-2">
      Step {stepIndex + 1} of {totalSteps}: {currentStep?.title}
    </div>

    <!-- Progress Bar -->
    <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
      <div
        class="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
        style="width: {progress}%"
      />
    </div>

    <!-- Current Action -->
    {#if currentStep?.action}
      <div class="text-yellow-300 text-sm mt-2 text-center animate-pulse">
        {currentStep.action}
      </div>
    {/if}
  </div>
</div>
