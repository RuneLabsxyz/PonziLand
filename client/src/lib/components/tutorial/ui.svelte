<script lang="ts">
  import TutoProgression from './tuto-progression.svelte';
  import Button from '../ui/button/button.svelte';
  import { goto } from '$app/navigation';
</script>

<div class="z-50 absolute top-0 left-0">
  <TutoProgression />
  <Button
    class="top-0 right-0 m-4 p-2 bg-blue-500 text-white rounded "
    on:click={() => goto('/game')}
  >
    Skip Tutorial
  </Button>
</div>
