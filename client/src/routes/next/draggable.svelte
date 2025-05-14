<script lang="ts">
  import { onMount } from 'svelte';
  import '@interactjs/auto-start';
  import '@interactjs/actions/drag';
  import '@interactjs/actions/resize';
  import '@interactjs/modifiers';
  import '@interactjs/dev-tools';
  import interact from '@interactjs/interact';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import { X, Minus } from 'lucide-svelte';

  let {
    id,
    type,
    gridSize = 30,
    inertia = true,
    initialPosition = { x: 0, y: 0 },
    restrictToParent = true,
    children,
  } = $props();

  let el = $state<HTMLElement | null>(null);
  let currentPosition = $state<{ x: number; y: number }>(initialPosition);
  let isMinimized = $state(false);

  onMount(() => {
    if (!el) return;

    // Add widget to store
    widgetsStore.addWidget({
      id,
      type,
      position: { x: initialPosition.x, y: initialPosition.y },
      isMinimized: false,
      isOpen: true
    });

    interact(el).draggable({
      modifiers: [
        interact.modifiers.snap({
          targets: [interact.snappers.grid({ x: gridSize, y: gridSize })],
          range: Infinity,
          relativePoints: [{ x: 0, y: 0 }],
        }),
        ...(restrictToParent
          ? [
              interact.modifiers.restrict({
                restriction: el.parentNode as HTMLElement,
                elementRect: { top: 0, left: 0, bottom: 1, right: 1 },
                endOnly: true,
              }),
            ]
          : []),
      ],
      listeners: {
        move(event) {
          currentPosition = {
            x: currentPosition.x + event.dx,
            y: currentPosition.y + event.dy,
          };
          widgetsStore.updateWidget(id, { position: { ...currentPosition } });
        },
      },
    });
  });

  function handleMinimize() {
    isMinimized = !isMinimized;
    widgetsStore.toggleMinimize(id);
  }

  function handleClose() {
    widgetsStore.closeWidget(id);
  }
</script>

<div
  bind:this={el}
  class="draggable"
  style="transform: translate({currentPosition.x}px, {currentPosition.y}px); pointer-events:auto"
>
  <div class="window-header">
    <div class="window-title">{type}</div>
    <div class="window-controls">
      <button class="window-control" on:click={handleMinimize}>
        <Minus size={16} />
      </button>
      <button class="window-control" on:click={handleClose}>
        <X size={16} />
      </button>
    </div>
  </div>
  {#if !isMinimized}
    <div class="window-content">
      {@render children()}
    </div>
  {/if}
</div>

<style>
  .draggable {
    position: absolute;
    touch-action: none;
    user-select: none;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    min-width: 200px;
  }

  .window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: rgba(0, 0, 0, 0.5);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    cursor: move;
  }

  .window-title {
    color: white;
    font-size: 14px;
    font-weight: 500;
  }

  .window-controls {
    display: flex;
    gap: 4px;
  }

  .window-control {
    background: none;
    border: none;
    color: white;
    padding: 4px;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .window-control:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  .window-content {
    padding: 16px;
  }
</style>
