<div class="progress-ponzi-gray w-full relative">
  <div
    class="h-12 -m-[2em] skew left-[1.5em] top-[.5em] pr-[3em] overflow-hidden relative flex"
  >
    <div class="w-full h-full bg-blue-500"></div>
    <div class="w-2 h-full bg-black-500"></div>
    <div class="w-full h-full bg-orange-500"></div>
  </div>
  <div
    class="bg-white h-[4px] opacity-50 absolute -m-[2em] skew left-[2.2em] top-[.65em] right-[1em]"
  ></div>
  <div
    class="bg-black h-2 opacity-25 absolute -m-[2em] skew left-[1em] bottom-[.5em] right-[2.2em]"
  ></div>
</div>

<style>
  .progress-ponzi-gray {
    background-clip: padding-box;
    border: solid transparent 2em;
    border-image-source: url('PnL/progress-slanted-gray.png');
    border-image-slice: 12;
    border-image-outset: 0;
    border-image-width: 2;
    image-rendering: pixelated;
  }
  .skew {
    transform: skew(-26deg);
  }
</style>
