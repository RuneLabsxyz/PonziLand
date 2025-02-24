<script lang="ts">
  import { onMount } from 'svelte';
  import { fly } from 'svelte/transition';

  let falling = false;
  let coinElement: HTMLImageElement;

  onMount(() => {
    // Start the animation when the component is mounted
    falling = true;
  });
</script>

<div class="container">
  {#if falling}
    <img
      id="coin"
      src="/assets/ui/ramp/coinGif.gif"
      alt="Coin Animation"
      transition:fly={{ y: -1000, duration: 5000 }}
      bind:this={coinElement}
    />
  {/if}
</div>

<style>
  .container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  #coin {
    width: 100px;
    position: absolute;
    left: 20%;
    bottom: 0;
    transform: translateX(-50%);
    cursor: pointer;
  }
</style>
