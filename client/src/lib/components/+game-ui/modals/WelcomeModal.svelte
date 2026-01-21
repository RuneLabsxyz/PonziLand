<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import Button from '$lib/components/ui/button/button.svelte';
  import CloseButton from '$lib/components/ui/close-button.svelte';
  import { welcomeModalStore } from '$lib/stores/welcome-modal.store.svelte';

  let visible = $derived(welcomeModalStore.shouldShow);

  function handleTutorial() {
    welcomeModalStore.markAsSeen();
    // Use full page navigation to ensure tutorial initializes properly
    window.location.href = '/tutorial';
  }

  function handleSkip() {
    welcomeModalStore.markAsSeen();
  }
</script>

{#if visible}
  <div class="fixed inset-0 bg-black bg-opacity-60 z-[99]">&nbsp;</div>

  <Card
    class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] p-10 bg-ponzi min-w-96 max-w-md"
  >
    <CloseButton onclick={handleSkip} />

    <div class="flex flex-col gap-6 items-center text-center">
      <!-- Ponzimaster Image -->
      <img
        src="/tutorial/PONZIMASTER.png"
        alt="Ponzimaster"
        class="w-24 h-24 object-contain"
      />

      <!-- Welcome Message -->
      <div class="flex flex-col gap-3">
        <h2 class="text-3xl font-bold">Welcome to PonziLand!</h2>
        <p class="text-base text-gray-300">
          New here? Let me guide you through the forbidden arts of on-chain
          deception!
        </p>
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-4 w-full">
        <Button onclick={handleTutorial} class="flex-1">Start Tutorial</Button>
        <Button variant="secondary" onclick={handleSkip} class="flex-1"
          >Skip for now</Button
        >
      </div>
    </div>
  </Card>
{/if}
