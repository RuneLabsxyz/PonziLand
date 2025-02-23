<script lang="ts">
  let { left, top, width, height } = $props<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>();

  const rotation = Math.random() * 360;
</script>

<div
  class="cloud-zone"
  style="
      left: {left}px;
      top: {top}px;
      width: {width}px;
      height: {height}px;
    "
>
  <div class="cloud-layer" style="transform: rotate({rotation}deg)"></div>
</div>

<style>
  .cloud-zone {
    position: absolute;
    pointer-events: none;
    z-index: 1;
  }

  .cloud-layer {
    position: absolute;
    background-color: rgba(255, 255, 255, 0.3);
    filter: blur(15px);
    transform-origin: center;
    width: 120px;
    height: 80px;
    top: 20px;
    left: 20px;
    border-radius: 40% 60% 60% 40% / 60% 30% 70% 40%;
  }
</style>
