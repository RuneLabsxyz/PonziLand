<script lang="ts">
  let { left, top, width, height } = $props<{
    left: number;
    top: number;
    width: number;
    height: number;
  }>();
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
  <div class="cloud-layer layer1"></div>
  <div class="cloud-layer layer2"></div>
  <div class="cloud-layer layer3"></div>
</div>

<style>
  .cloud-zone {
    position: absolute;
    pointer-events: none;
    z-index: 1;
  }

  .cloud-layer {
    position: absolute;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.5);
    filter: blur(10px);
    animation: moveClouds 10s infinite alternate ease-in-out;
  }

  .layer1 {
    width: 100px;
    height: 60px;
    top: 20px;
    left: 20px;
    animation-duration: 12s;
    animation-direction: alternate-reverse;
  }

  .layer2 {
    width: 120px;
    height: 70px;
    top: 40px;
    left: 50px;
    animation-duration: 15s;
  }

  .layer3 {
    width: 80px;
    height: 50px;
    top: 60px;
    left: 30px;
    animation-duration: 18s;
    animation-direction: alternate-reverse;
  }

  @keyframes moveClouds {
    0% {
      transform: translate(0, 0) rotate(0deg);
    }
    50% {
      transform: translate(10px, -10px) rotate(5deg);
    }
    100% {
      transform: translate(-10px, 10px) rotate(-5deg);
    }
  }
</style>
