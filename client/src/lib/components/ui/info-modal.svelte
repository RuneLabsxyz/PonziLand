<script lang="ts">
  import Card from './card/card.svelte';
  import Button from './button/button.svelte';
  import { goto } from '$app/navigation';
  import { uiStore } from '$lib/stores/ui.store.svelte';
  let { isDisplay } = $props<{ isDisplay: boolean }>();
</script>

{#if isDisplay}
  <Card
    class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-[9999] shadow-md"
  >
    <button
      class="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
      onclick={() => (uiStore.modalInfo = false)}
      aria-label="Close modal"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
    <div class="flex flex-col gap-4 p-6">
      <img
        src="/tutorial/PONZIMASTER.png"
        alt="Ponzimaster"
        class="w-24 h-24 mx-auto"
      />
      <p class="text-center font-bold text-sm md:text-base">
        HAHAHAHAHA! Still confused?
        <br />
        Let me guide you through the depths of deception in my tutorial,
        <br />
        or brave the forbidden scrolls of knowledge in the documentation!
      </p>
      <div class="flex justify-center gap-4">
        <Button onclick={() => goto('/tutorial')}>Tutorial</Button>
        <a href="https://docs.ponzi.land" target="_blank"
          ><Button>Docs</Button></a
        >
      </div>
    </div>
  </Card>
{/if}
