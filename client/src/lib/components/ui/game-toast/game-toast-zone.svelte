<script lang="ts">
  import { activityStore } from '$lib/stores/activity.store.svelte';
  import GameToast from './game-toast.svelte';
  import { flip } from 'svelte/animate';
  import { fly } from 'svelte/transition';

  const toasts = $derived(activityStore.toasts);
</script>

<div class="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] pointer-events-none">
  <div class="flex flex-col gap-2 items-center">
    {#each toasts as toast (toast.id)}
      <div
        animate:flip={{ duration: 400 }}
        in:fly={{ y: -50, duration: 500 }}
        out:fly={{ y: -30, duration: 400 }}
        class="pointer-events-auto"
      >
        <GameToast event={toast} />
      </div>
    {/each}
  </div>
</div>
