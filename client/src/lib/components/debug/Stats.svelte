<script lang="ts">
  import Stats from 'stats.js';

  var stats = new Stats();
  stats.showPanel(1); // 0: fps, 1: ms, 2: mb, 3+: custom

  let ref = $state<HTMLElement>();

  $effect(() => {
    ref?.appendChild(stats.dom);
  });
</script>

<div bind:this={ref}></div>
