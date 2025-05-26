<script>
  let {
    min = 1,
    max = 8,
    value = $bindable(2),
    step = 1,
    labels = ['1', '2', '3', '4', '5', '6', '7', '8'],
  } = $props();

  let sliderElement = $state();
  let isDragging = $state(false);

  // Calculate the position of the slider handle based on value
  let handlePosition = $derived(((value - min) / (max - min)) * 100);

  function handleMouseDown(event) {
    isDragging = true;
    updateValue(event);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event) {
    if (isDragging) {
      updateValue(event);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function updateValue(event) {
    if (!sliderElement) return;

    const rect = sliderElement.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const percentage = Math.max(0, Math.min(1, 1 - y / rect.height));

    const newValue = min + percentage * (max - min);
    value = Math.round(newValue / step) * step;
    value = Math.max(min, Math.min(max, value));
  }

  function handleKeyDown(event) {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        value = Math.min(max, value + step);
        break;
      case 'ArrowDown':
        event.preventDefault();
        value = Math.max(min, value - step);
        break;
    }
  }
</script>

<div class="slider-container">
  <div
    class="slider-track"
    bind:this={sliderElement}
    on:mousedown={handleMouseDown}
    role="slider"
    tabindex="0"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    on:keydown={handleKeyDown}
  >
    <!-- Track line -->
    <div class="track-line"></div>

    <!-- Stop circles -->
    {#each labels as label, index}
      <div
        class="stop-circle"
        style="bottom: {(index / (labels.length - 1)) * 100}%"
      ></div>
    {/each}

    <!-- Labels -->
    {#each labels as label, index}
      <div
        class="label font-ponzi-number"
        style="bottom: {(index / (labels.length - 1)) * 100}%"
      >
        {label}
      </div>
    {/each}

    <!-- Handle -->
    <div
      class="handle"
      style="bottom: {handlePosition}%"
      class:dragging={isDragging}
    ></div>
  </div>
</div>

<style>
  .slider-container {
    display: flex;
    align-items: center;
    width: fit-content;
  }

  .slider-track {
    position: relative;
    width: 40px;
    height: 100%;
    cursor: pointer;
    outline: none;
  }

  .track-line {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: #4a4a6a;
    transform: translateX(-50%);
  }

  .stop-circle {
    position: absolute;
    left: 50%;
    width: 6px;
    height: 6px;
    background-color: #888;
    border-radius: 50%;
    transform: translate(-50%, 50%);
    pointer-events: none;
    z-index: 1;
  }

  .label {
    position: absolute;
    right: 0;
    color: #ffffff;
    font-size: 10px;
    transform: translateY(50%);
    user-select: none;
    pointer-events: none;
  }

  .handle {
    position: absolute;
    left: 50%;
    width: 12px;
    height: 12px;
    background-color: #4a9eff;
    transform: translate(-50%, 50%);
    cursor: grab;
    transition: all 0.1s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  .handle:hover {
    background-color: #5ba8ff;
    transform: translate(-50%, 50%) scale(1.1);
  }

  .handle.dragging {
    cursor: grabbing;
    transform: translate(-50%, 50%) scale(1.2);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  }

  .slider-track:focus .handle {
    box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.3);
  }
</style>
