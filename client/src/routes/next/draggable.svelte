<script lang="ts">
  import { widgetsStore } from '$lib/stores/widgets.store';
  import '@interactjs/actions';
  import '@interactjs/actions/drag';
  import '@interactjs/actions/resize';
  import '@interactjs/auto-start';
  import '@interactjs/dev-tools';
  import interact from '@interactjs/interact';
  import '@interactjs/modifiers';
  import '@interactjs/snappers';
  import '@interactjs/reflow';
  import { Minus, X } from 'lucide-svelte';
  import { onMount } from 'svelte';

  interface Position {
    x: number;
    y: number;
  }

  interface Dimensions {
    width: number;
    height: number;
  }

  let {
    id,
    type,
    gridSize = 30,
    initialPosition = { x: 0, y: 0 } as Position,
    restrictToParent = true,
    children,
  } = $props();

  let el = $state<HTMLElement | null>(null);
  let currentPosition = $state<Position>(initialPosition);
  let currentDimensions = $state<Dimensions | null>(null);
  let isMinimized = $state(false);

  onMount(() => {
    if (!el) return;

    // Add widget to store if it doesn't exist
    const currentWidget = $widgetsStore[id];
    if (!currentWidget) {
      widgetsStore.addWidget({
        id,
        type,
        position: { x: initialPosition.x, y: initialPosition.y },
        isMinimized: false,
        isOpen: true,
      });
    }

    const interactable = interact(el)
      .draggable({
        allowFrom: '.window-header',
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

            currentDimensions = {
              width: event.rect.width,
              height: event.rect.height
            };
            
            // Save both position and current dimensions
            widgetsStore.updateWidget(id, { 
              position: { ...currentPosition },
              dimensions: currentDimensions || undefined
            });
          },
        },
      })
      .resizable({
        allowFrom: '.window-resize-handle',
        edges: { right: true, bottom: true },
        listeners: {
          move(event) {
            let { x, y } = event.target.dataset;
            x = (parseFloat(x) || currentPosition.x) + event.deltaRect.left;
            y = (parseFloat(y) || currentPosition.y) + event.deltaRect.top;

            // Update current dimensions
            currentDimensions = {
              width: event.rect.width,
              height: event.rect.height
            };

            Object.assign(event.target.style, {
              width: `${event.rect.width}px`,
              height: `${event.rect.height}px`,
              transform: `translate(${x}px, ${y}px)`,
            });

            Object.assign(event.target.dataset, { x, y });
            currentPosition = { x, y };
            
            // Save both position and dimensions
            widgetsStore.updateWidget(id, { 
              position: { x, y },
              dimensions: currentDimensions
            });
          },
        },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 200, height: 50 },
          }),
        ],
      });

    // Initialize dataset with current position
    el.dataset.x = currentPosition.x.toString();
    el.dataset.y = currentPosition.y.toString();

    // Initialize dimensions if they exist in the store
    const widget = $widgetsStore[id];
    if (widget?.dimensions) {
      currentDimensions = widget.dimensions;
      Object.assign(el.style, {
        width: `${widget.dimensions.width}px`,
        height: `${widget.dimensions.height}px`,
      });
    }

    async function onWindowResize() {
      // start a resize action and wait for inertia to finish
      await interactable.reflow({ name: 'drag', axis: 'xy' });
    }

    window.addEventListener('resize', onWindowResize);
  });

  function handleMinimize() {
    isMinimized = !isMinimized;
    // Save current dimensions before minimizing
    if (el) {
      const rect = el.getBoundingClientRect();
      currentDimensions = {
        width: rect.width,
        height: rect.height
      };
      widgetsStore.updateWidget(id, {
        isMinimized,
        dimensions: currentDimensions
      });
    } else {
      widgetsStore.toggleMinimize(id);
    }
  }

  function handleClose() {
    widgetsStore.closeWidget(id);
  }
</script>

<div
  bind:this={el}
  class="draggable"
  style="transform: translate({currentPosition.x}px, {currentPosition.y}px); pointer-events:all"
>
  <div class="window-header">
    <div class="window-title">{type}</div>
    <div class="window-controls">
      <button class="window-control" onclick={handleMinimize}>
        <Minus size={16} />
      </button>
      <button class="window-control" onclick={handleClose}>
        <X size={16} />
      </button>
    </div>
  </div>
  {#if !isMinimized}
    <div class="window-content">
      {@render children()}
    </div>
    <div class="window-resize-handle" style="pointer-events:all"></div>
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
    cursor: grab;
  }

  .window-header:active {
    cursor: grabbing;
  }

  .window-title {
    color: white;
    font-size: 14px;
    font-weight: 500;
    user-select: none;
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

  .window-resize-handle {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 20px;
    height: 20px;
    cursor: nwse-resize;
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.1),
      rgba(255, 255, 255, 0.1) 2px,
      transparent 2px,
      transparent 4px
    );
  }

  .window-resize-handle:hover {
    background-image: repeating-linear-gradient(
      45deg,
      rgba(255, 255, 255, 0.2),
      rgba(255, 255, 255, 0.2) 2px,
      transparent 2px,
      transparent 4px
    );
  }
</style>
