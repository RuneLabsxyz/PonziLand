<script lang="ts">
  // This is only for the tournament!
  import { fade, slide } from 'svelte/transition';

  let message =
    'WARNING: All tokens are fake and hold no long-term value. This is for tournament purposes only.';
  let backgroundColor = '#ffcc00';
  let textColor = '#000';

  let isVisible = $state(true);
</script>

{#if isVisible}
  <div
    class="fixed top-0 left-0 w-full z-[9999] shadow-md"
    style="background-color: {backgroundColor}; color: {textColor};"
    transition:slide={{ duration: 300, axis: 'y' }}
  >
    <div class="relative px-4 py-1 flex items-center justify-center">
      <p class="text-center font-bold text-sm md:text-base pr-8">{message}</p>
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-sm hover:underline px-2"
        onclick={() => (isVisible = false)}
      >
        X
      </button>
    </div>
  </div>
{/if}
