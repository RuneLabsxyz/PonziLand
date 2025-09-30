<script lang="ts">
  import type { Mouse } from 'lucide-svelte';

  let {
    min = 0,
    max = 8,
    value = $bindable(2),
    step = 1,
    labels = ['0', '1', '2', '3', '4', '5', '6', '7', '8'],
    orientation = 'horizontal',
  } = $props();

  let sliderElement: HTMLElement | undefined = $state();
  let isDragging = $state(false);

  // Calculate the position of the slider handle based on value
  let handlePosition = $derived(((value - min) / (max - min)) * 100);

  function handleMouseDown(event: MouseEvent) {
    isDragging = true;
    updateValue(event);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event: MouseEvent) {
    if (isDragging) {
      updateValue(event);
    }
  }

  function handleMouseUp() {
    isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  function updateValue(event: MouseEvent) {
    if (!sliderElement) return;

    const rect = sliderElement.getBoundingClientRect();
    let percentage: number;

    if (orientation === 'horizontal') {
      const x = event.clientX - rect.left;
      percentage = Math.max(0, Math.min(1, x / rect.width));
    } else {
      const y = event.clientY - rect.top;
      percentage = Math.max(0, Math.min(1, 1 - y / rect.height));
    }

    const newValue = min + percentage * (max - min);
    value = Math.round(newValue / step) * step;
    value = Math.max(min, Math.min(max, value));
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (orientation === 'horizontal') {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          value = Math.min(max, value + step);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          value = Math.max(min, value - step);
          break;
      }
    } else {
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
  }
</script>

<div
  class="slider-container"
  class:horizontal={orientation === 'horizontal'}
  class:vertical={orientation === 'vertical'}
>
  <div
    class="slider-track"
    class:horizontal={orientation === 'horizontal'}
    class:vertical={orientation === 'vertical'}
    bind:this={sliderElement}
    onmousedown={handleMouseDown}
    role="slider"
    tabindex="0"
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuenow={value}
    onkeydown={handleKeyDown}
  >
    <!-- Track line -->
    <div class="track-line"></div>

    <!-- Stop circles -->
    {#each labels as label, index}
      <div
        class="stop-circle"
        style={orientation === 'horizontal'
          ? `left: ${(index / (labels.length - 1)) * 100}%`
          : `bottom: ${(index / (labels.length - 1)) * 100}%`}
      ></div>
    {/each}

    <!-- Labels -->
    {#each labels as label, index}
      <div
        class="label font-ponzi-number {value === index ? 'selected' : ''}"
        style={orientation === 'horizontal'
          ? `left: ${(index / (labels.length - 1)) * 100}%`
          : `bottom: ${(index / (labels.length - 1)) * 100}%`}
      >
        {label}
      </div>
    {/each}

    <!-- Handle -->
    <div
      class="handle"
      style={orientation === 'horizontal'
        ? `left: ${handlePosition}%`
        : `bottom: ${handlePosition}%`}
      class:dragging={isDragging}
      class:horizontal={orientation === 'horizontal'}
      class:vertical={orientation === 'vertical'}
    ></div>
  </div>
</div>

<style>
  .slider-container {
    display: flex;
    align-items: center;
  }

  .slider-container.horizontal {
    width: 100%;
    padding: 20px 10px 0 10px; /* Add top padding for numbers */
  }

  .slider-container.vertical {
    height: 220px;
    padding: 10px 0;
  }

  .slider-track {
    position: relative;
    cursor: pointer;
    outline: none;
  }

  /* Vertical orientation (original) */
  .slider-track.vertical {
    width: 40px;
    height: 200px;
  }

  /* Horizontal orientation */
  .slider-track.horizontal {
    width: 100%;
    height: 10px;
    min-width: 200px;
  }

  .track-line {
    position: absolute;
    background-color: #4a4a6a;
  }

  /* Vertical track line */
  .vertical .track-line {
    left: 50%;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-50%);
  }

  /* Horizontal track line */
  .horizontal .track-line {
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    transform: translateY(-50%);
  }

  .stop-circle {
    position: absolute;
    width: 6px;
    height: 6px;
    background-color: #888;
    border-radius: 50%;
    pointer-events: none;
    z-index: 1;
  }

  /* Vertical stop circles */
  .vertical .stop-circle {
    left: 50%;
    transform: translate(-50%, 50%);
  }

  /* Horizontal stop circles */
  .horizontal .stop-circle {
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .label {
    position: absolute;
    color: #ffffff;
    font-size: 10px;
    user-select: none;
    pointer-events: none;
  }

  /* Vertical labels */
  .vertical .label {
    right: 0;
    transform: translateY(50%);
  }

  /* Horizontal labels */
  .horizontal .label {
    bottom: 100%;
    transform: translate(-50%, -4px);
    margin-bottom: 4px;
  }

  /* Selected label styling */
  .label.selected {
    color: #4a9eff;
    font-size: 14px;
    font-weight: bold;
    transform: translate(-50%, -4px) scale(1.2);
  }

  .vertical .label.selected {
    transform: translateY(50%) scale(1.2);
  }

  .handle {
    position: absolute;
    width: 12px;
    height: 12px;
    background-color: #4a9eff;
    border-radius: 50%;
    cursor: grab;
    transition: all 0.1s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    z-index: 2;
  }

  /* Vertical handle */
  .handle.vertical {
    left: 50%;
    transform: translate(-50%, 50%);
  }

  /* Horizontal handle */
  .handle.horizontal {
    top: 50%;
    transform: translate(-50%, -50%);
  }

  .handle:hover {
    background-color: #5ba8ff;
  }

  .handle.vertical:hover {
    transform: translate(-50%, 50%) scale(1.1);
  }

  .handle.horizontal:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }

  .handle.dragging {
    cursor: grabbing;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
  }

  .handle.vertical.dragging {
    transform: translate(-50%, 50%) scale(1.2);
  }

  .handle.horizontal.dragging {
    transform: translate(-50%, -50%) scale(1.2);
  }

  .slider-track:focus .handle {
    box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.3);
  }
</style>
