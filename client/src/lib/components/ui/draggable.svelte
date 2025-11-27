<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Card } from '$lib/components/ui/card';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { Slider } from '$lib/components/ui/slider';
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
  import { Minus, MoreVertical, X, Maximize, Minimize } from 'lucide-svelte';
  import { onMount, onDestroy } from 'svelte';

  interface Position {
    x: number;
    y: number;
  }

  interface Dimensions {
    width: number;
    height: number;
  }

  type Props = {
    id: string;
    type: string;
    gridSize?: number;
    initialPosition?: Position;
    initialDimensions?: Dimensions;
    restrictToParent?: boolean;
    children: Snippet<
      [
        {
          setCustomControls: (controls: Snippet<[]> | null) => void;
          setCustomTitle: (title: Snippet<[]> | null) => void;
        },
      ]
    >;
    isMinimized?: boolean;
    disableResize?: boolean;
  };

  let {
    id,
    type,
    gridSize = 30,
    initialPosition = { x: 0, y: 0 } as Position,
    initialDimensions = { width: 200, height: 50 } as Dimensions,
    restrictToParent = true,
    children,
    isMinimized = $bindable(false),
    disableResize = false,
  }: Props = $props();

  let el = $state<HTMLElement | null>(null);
  let currentPosition = $state<Position>(initialPosition);
  let currentDimensions = $state<Dimensions>(initialDimensions);
  let isFixed = $state($widgetsStore[id]?.fixed || false);
  let fixedStyles = $state($widgetsStore[id]?.fixedStyles || '');
  let disableControls = $state($widgetsStore[id]?.disableControls || false);
  let transparency = $state($widgetsStore[id]?.transparency ?? 1);
  let isMaximized = $state($widgetsStore[id]?.isMaximized || false);
  let showMaximize = $state($widgetsStore[id]?.showMaximize || false);
  // svelte-ignore state_referenced_locally - We want to be able to modify the transparency value
  let sliderValue = $state(transparency * 100);
  let customControls = $state<Snippet<[]> | null>(null);
  let customTitle = $state<Snippet<[]> | null>(null);
  // Compute the style string based on whether the widget is fixed, maximized, or normal
  let styleString = $derived(
    isFixed
      ? `${fixedStyles} pointer-events:all;z-index:${$widgetsStore[id]?.zIndex || 0};opacity:${transparency}`
      : isMaximized
        ? `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events:all; z-index: ${$widgetsStore[id]?.zIndex || 0}; opacity:${transparency}; transform: none;`
        : `transform: translate(${currentPosition.x}px, ${currentPosition.y}px); pointer-events:all; width:${currentDimensions?.width}px; height:${
            currentDimensions?.height == 0 ? 'auto' : currentDimensions.height
          }px; z-index: ${$widgetsStore[id]?.zIndex || 0}; opacity:${transparency}`,
  );

  function handleClick() {
    widgetsStore.bringToFront(id);
  }

  function handleTransparencyChange(value: number) {
    const newValue = Math.max(10, Math.min(100, value)) / 100;
    transparency = newValue;
    widgetsStore.updateWidget(id, { transparency: newValue });
  }

  function setCustomControls(controls: Snippet<[]> | null) {
    customControls = controls;
  }

  function setCustomTitle(title: Snippet<[]> | null) {
    customTitle = title;
  }

  let interactInstance = $state<any>(null);

  function cleanupInteract() {
    if (interactInstance) {
      interactInstance.unset();
      interactInstance = null;
    }
  }

  function setupInteract() {
    // Clean up existing instance first
    cleanupInteract();

    if (!el || isFixed || isMaximized) return;

    const interactable = interact(el).draggable({
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
    });

    if (!disableResize) {
      interactable.resizable({
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
    }

    interactInstance = interactable;

    async function onWindowResize() {
      // start a resize action and wait for inertia to finish
      if (interactInstance) {
        await interactInstance.reflow({ name: 'drag', axis: 'xy' });
      }
    }

    window.addEventListener('resize', onWindowResize);
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
        fixed: false,
        fixedStyles: '',
      });
    } else {
      isFixed = currentWidget.fixed || false;
      fixedStyles = currentWidget.fixedStyles || '';
    }

    // Set up interact
    setupInteract();
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

  function handleMaximize() {
    if (isMaximized) {
      widgetsStore.restoreWidget(id);
    } else {
      widgetsStore.maximizeWidget(id);
    }
  }

  // Update local state when store changes and re-setup interact when needed
  $effect(() => {
    const storeWidget = $widgetsStore[id];
    if (storeWidget) {
      const wasMaximized = isMaximized;
      isMaximized = storeWidget.isMaximized || false;
      showMaximize = storeWidget.showMaximize || false;

      // If maximized state changed, re-setup interact
      if (wasMaximized !== isMaximized) {
        setupInteract();
      }

      if (storeWidget.position) {
        currentPosition = storeWidget.position;
      }
      if (storeWidget.dimensions) {
        currentDimensions = storeWidget.dimensions;
      }
    }
  });

  onDestroy(() => {
    cleanupInteract();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  bind:this={el}
  class="draggable relative"
  class:fixed={isFixed}
  style={styleString}
  onclick={handleClick}
>
  <Card class="w-full h-full bg-ponzi flex flex-col">
    <div class="window-header" class:no-drag={isFixed || isMaximized}>
      <div class="window-title font-ponzi-number">
        {#if customTitle}
          {@render customTitle()}
        {:else}
          {id}
        {/if}
      </div>
      <div class="window-controls text-white">
        {#if customControls}
          {@render customControls()}
        {/if}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <button class="window-control">
              <MoreVertical size={16} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            <Card style="opacity: {transparency}">
              <DropdownMenu.Group>
                <DropdownMenu.Label>Transparency</DropdownMenu.Label>
                <Slider
                  type="single"
                  bind:value={sliderValue}
                  max={100}
                  min={10}
                  step={10}
                  onValueChange={handleTransparencyChange}
                />
                <span class="transparency-value text-white"
                  >{Math.round(transparency * 100)}%</span
                >
              </DropdownMenu.Group>
            </Card>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
        {#if !disableControls}
          {#if showMaximize}
            <button class="window-control" onclick={handleMaximize}>
              {#if isMaximized}
                <Minimize size={16} />
              {:else}
                <Maximize size={16} />
              {/if}
            </button>
          {/if}
          <button class="window-control" onclick={handleMinimize}>
            <Minus size={16} />
          </button>
          <button class="window-control" onclick={handleClose}>
            <X size={16} />
          </button>
        {/if}
      </div>
    </div>
    <div class="min-h-0 w-full h-full">
      {@render children({ setCustomControls, setCustomTitle })}
    </div>
  </Card>
  {#if !isFixed && !disableResize && !isMaximized}
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

  .draggable.fixed {
    pointer-events: all;
    /* Remove transform and position styles when fixed as they'll be handled by fixedStyles */
    transform: none !important;
  }

  .window-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: grab;
  }

  .window-header.no-drag {
    cursor: default;
  }

  .window-header:active:not(.no-drag) {
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

  :global {
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
