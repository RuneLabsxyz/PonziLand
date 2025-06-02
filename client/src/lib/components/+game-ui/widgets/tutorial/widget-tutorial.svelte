<script lang="ts">
  import { goto } from '$app/navigation';
  import dialogData from '$lib/components/tutorial/dialog.json';
  import {
    nextStep,
    previousStep,
    tutorialState,
  } from '$lib/components/tutorial/stores.svelte';
  import TypingEffect from '$lib/components/tutorial/typing-effect.svelte';
  import Button from '$lib/components/ui/button/button.svelte';
  import { onDestroy } from 'svelte';

  let currentDialog = $derived(dialogData[tutorialState.tutorialProgress - 1]);

  let fadeOutInterval = $state<NodeJS.Timeout | undefined>(undefined);
  let vignetteInterval = $state<NodeJS.Timeout | undefined>(undefined);
  let nukeInterval = $state<NodeJS.Timeout | undefined>(undefined);

  onDestroy(() => {
    if (fadeOutInterval) clearInterval(fadeOutInterval);
    if (vignetteInterval) clearInterval(vignetteInterval);
    if (nukeInterval) clearInterval(nukeInterval);
  });

  function formatText(text: string) {
    return text.replaceAll('\n', '<br>');
  }
</script>

{#if currentDialog}
  <div class="flex gap-4 mt-6">
    <div class="h-36 w-36 flex-shrink-0">
      <img
        src={`/tutorial/ponziworker_${currentDialog.image_id}.png`}
        alt="Ponzi Worker"
        class="h-full w-full object-contain"
      />
    </div>
    <div class="text-white mt-4">
      <!-- {@html formatText(currentDialog.text)} -->
      <TypingEffect
        html={formatText(currentDialog.text)}
        speed={10}
        onComplete={() => console.log('Dialog complete!')}
      />
    </div>
  </div>
  <div class="w-full flex gap-6 items-center justify-center p-4">
    <Button size="md" onclick={previousStep}>prev.</Button>
    <div class="font-ponzi-number text-white">
      {tutorialState.tutorialProgress}/{dialogData.length}
    </div>
    <Button size="md" onclick={nextStep}>next</Button>
  </div>
  <Button
    size="md"
    class="top-0 right-0 absolute m-2 bg-blue-500 text-white rounded "
    onclick={() => goto('/game')}
  >
    Skip Tutorial
  </Button>
{:else}
  <div class="flex gap-6 items-center">
    <div
      class="text-ponzi-number text-center tracking-wide flex flex-col items-center"
    >
      <span>
        HAHAHAHAHA This is what the PONZI LAND is about. Fight or Die.
      </span>
      <Button onclick={() => goto('game')} class="mt-4">ENTER THE ARENA</Button>
    </div>
    <img
      src="/tutorial/PONZIMASTER.png"
      alt="Ponzi master"
      class="h-auto w-64"
    />
    <Button
      size="md"
      class="top-0 right-0 absolute m-2 bg-blue-500 text-white rounded "
      onclick={() => {
        tutorialState.tutorialProgress = 1;
      }}
    >
      restart tutorial
    </Button>
  </div>
{/if}
