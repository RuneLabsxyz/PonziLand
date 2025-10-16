<script lang="ts">
  import { tutorialStore } from '$lib/stores/tutorial.store.svelte';
  import { fade, slide } from 'svelte/transition';

  let dialogue = $derived(tutorialStore.currentDialogue);
</script>

{#if dialogue}
  <div
    class="fixed bottom-20 left-1/2 -translate-x-1/2 max-w-2xl w-full px-4"
    transition:slide={{ duration: 300 }}
  >
    <div
      class="bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl p-6"
    >
      <!-- Speaker -->
      <div class="flex items-center gap-3 mb-4">
        {#if dialogue.avatar}
          <img
            src={dialogue.avatar}
            alt={dialogue.speaker}
            class="w-12 h-12 rounded-full border-2 border-blue-500"
          />
        {:else}
          <div
            class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center"
          >
            <span class="text-white font-bold text-xl">?</span>
          </div>
        {/if}
        <h3 class="text-xl font-bold text-white">{dialogue.speaker}</h3>
      </div>

      <!-- Message -->
      <div class="text-white/90 whitespace-pre-wrap">
        {dialogue.text}
      </div>

      <!-- Continue button -->
      <div class="mt-6 flex justify-end">
        <button
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md
                 transition-colors font-medium flex items-center gap-2"
          onclick={() => {
            tutorialStore.hideDialogue();
            // Auto progress for some steps
            if (tutorialStore.currentStep?.id === 'welcome') {
              tutorialStore.nextStep();
            }
          }}
        >
          Continue
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
{/if}
