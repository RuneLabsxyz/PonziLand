<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { widgetsStore } from '$lib/stores/widgets.store';
  import '@interactjs/actions';
  import '@interactjs/actions/drag';
  import '@interactjs/actions/resize';
  import '@interactjs/auto-start';
  import '@interactjs/dev-tools';
  import interact from '@interactjs/interact';
  import '@interactjs/modifiers';
  import '@interactjs/reflow';
  import '@interactjs/snappers';
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
    initialDimensions = { width: 200, height: 50 } as Dimensions,
    restrictToParent = true,
    children,
  } = $props();

  let el = $state<HTMLElement | null>(null);
  let currentPosition = $state<Position>(initialPosition);
  let currentDimensions = $state<Dimensions>(initialDimensions);
  let isMinimized = $state(false);

  function handleClick() {
    widgetsStore.bringToFront(id);
  }

  onMount(() => {
    if (!el) return;

    // Add widget to store if it doesn't exist
    const currentWidget = $widgetsStore[id];
    if (!currentWidget) {
      widgetsStore.addWidget({
        id,
        type,
        position: initialPosition,
        dimensions: initialDimensions,
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

            // Save both position and current dimensions
            widgetsStore.updateWidget(id, {
              position: { ...currentPosition },
              dimensions: currentDimensions || undefined,
            });
          },
        },
      })
      .resizable({
        allowFrom: '.window-resize-handle',
        edges: { right: true, bottom: true },
        listeners: {
          move(event) {
            // Update current dimensions
            currentDimensions = {
              width: event.rect.width,
              height: event.rect.height,
            };

            // Save both position and dimensions
            widgetsStore.updateWidget(id, {
              dimensions: currentDimensions,
            });
          },
        },
        modifiers: [
          interact.modifiers.restrictSize({
            min: { width: 200, height: 50 },
          }),
        ],
      });

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
      widgetsStore.updateWidget(id, {
        isMinimized,
      });
    } else {
      widgetsStore.toggleMinimize(id);
    }
  }

  function handleClose() {
    widgetsStore.closeWidget(id);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={el}
  class="draggable overflow-hidden"
  style="transform: translate({currentPosition.x}px, {currentPosition.y}px); pointer-events:all; width:{currentDimensions?.width}px; height:{isMinimized
    ? 0
    : currentDimensions?.height}px; z-index: {$widgetsStore[id]?.zIndex || 0};"
  onclick={handleClick}
>
  <Card class="w-full h-full">
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
    {/if}
  </Card>
  {#if !isMinimized}
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
    min-height: 50px;
  }

  .window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
    padding: 1rem 0;
    height: 100%;
    width: 100%;
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
