<script lang="ts">
  import { onMount } from 'svelte';
  import '@interactjs/auto-start';
  import '@interactjs/actions/drag';
  import '@interactjs/actions/resize';
  import '@interactjs/modifiers';
  import '@interactjs/dev-tools';
  import interact from '@interactjs/interact';

  let {
    gridSize = 30,
    inertia = true,
    initialPosition = { x: 0, y: 0 },
    restrictToParent = true,
    children,
  } = $props();

  let el = $state<HTMLElement | null>(null);
  let currentPosition = $state(initialPosition);

  onMount(() => {
    if (!el) return;

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
          console.log('move', event);
          currentPosition = {
            x: currentPosition.x + event.dx,
            y: currentPosition.y + event.dy,
          };
        },
      },
    });
  });

  $inspect(currentPosition);
</script>

<div
  bind:this={el}
  class="draggable"
  style="transform: translate({currentPosition.x}px, {currentPosition.y}px); pointer-events:auto"
>
  {@render children()}
</div>

<style>
  .draggable {
    position: absolute;
    touch-action: none;
    user-select: none;
  }
</style>
