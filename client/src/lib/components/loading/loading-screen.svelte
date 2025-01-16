<script lang="ts">
  import { fade } from 'svelte/transition';
  import ThreeDots from './three-dots.svelte';
  import Progress from '../ui/progress/progress.svelte';

  let { value } = $props();
</script>

<div
  transition:fade
  class="absolute inset-0 flex items-center justify-center bg-[#322637] flex-col z-50 dark"
>
  <!-- will need an svg for smooth rendering-->
  <!-- <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-pyramid text-white h-20 w-20"
                ><path
                    d="M2.5 16.88a1 1 0 0 1-.32-1.43l9-13.02a1 1 0 0 1 1.64 0l9 13.01a1 1 0 0 1-.32 1.44l-8.51 4.86a2 2 0 0 1-1.98 0Z"
                /><path d="M12 2v20" /></svg
            > -->
  <h1 class="text-4xl text-ponzi">PONZI LAND</h1>
  <div class="text-2xl text-white">
    loading
    <ThreeDots />
  </div>
  <Progress {value} max={100} class="w-[60%]" />
</div>
