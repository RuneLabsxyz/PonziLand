<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { Tile } from '$lib/api/tile-store.svelte';

  let { tiles }: { tiles: Tile[][] } = $props();

  const hexToInt = (hexLocation: string) => parseInt(hexLocation, 16);

  const MAX_CONCURRENT_ENTITIES = 5;

  function waitForTransitionEnd(
    element: HTMLElement,
    propertyName: string,
  ): Promise<void> {
    return new Promise((resolve) => {
      const handler = (event: TransitionEvent) => {
        if (event.propertyName === propertyName) {
          element.removeEventListener('transitionend', handler);
          resolve();
        }
      };
      element.addEventListener('transitionend', handler);
    });
  }

  async function animateEntity(entity: HTMLElement, buildingPair: number[]) {
    const [from, to] = buildingPair;

    const fromX = (from % 64) * 32 - 5;
    const fromY = Math.floor(from / 64) * 32 - 5;
    const toX = (to % 64) * 32 - 5;
    const toY = Math.floor(to / 64) * 32 - 5;

    entity.style.opacity = '1';
    entity.style.transition = 'none';
    entity.style.transform = `translate(${fromX}px, ${fromY}px)`;
    entity.getBoundingClientRect();

    const dx = toX - fromX;
    const dy = toY - fromY;
    const speed = 10;
    const durationX = (Math.abs(dx) / speed) * 1000;
    const durationY = (Math.abs(dy) / speed) * 1000;

    if (dx !== 0 && dy !== 0) {
      entity.style.transition = `transform ${durationX}ms linear`;
      requestAnimationFrame(() => {
        entity.style.transform = `translate(${toX}px, ${fromY}px)`;
      });
      await waitForTransitionEnd(entity, 'transform');

      entity.style.transition = `transform ${durationY}ms linear`;
      requestAnimationFrame(() => {
        entity.style.transform = `translate(${toX}px, ${toY}px)`;
      });
      await waitForTransitionEnd(entity, 'transform');
    } else if (dx !== 0) {
      entity.style.transition = `transform ${durationX}ms linear`;
      requestAnimationFrame(() => {
        entity.style.transform = `translate(${toX}px, ${fromY}px)`;
      });
      await waitForTransitionEnd(entity, 'transform');
    } else if (dy !== 0) {
      entity.style.transition = `transform ${durationY}ms linear`;
      requestAnimationFrame(() => {
        entity.style.transform = `translate(${fromX}px, ${toY}px)`;
      });
      await waitForTransitionEnd(entity, 'transform');
    }
  }

  const interval = setInterval(() => {
    const activeLands = tiles.flat().filter((tile) => tile?.type !== 'grass');
    if (activeLands.length < 2) return;

    for (let i = 0; i < MAX_CONCURRENT_ENTITIES; i++) {
      const shuffledLands = [...activeLands].sort(() => Math.random() - 0.5);
      const selected = shuffledLands
        .slice(0, 2)
        .map((tile) => hexToInt(tile.location));

      const entity = document.createElement('div');
      entity.className =
        'character h-2 w-2 absolute transition-transform ease-linear';
      entity.style.opacity = '0';

      const duckNumber = Math.floor(Math.random() * 5) + 1;
      entity.style.backgroundImage = `url(/assets/Ducks/Duck${duckNumber}.png)`;
      entity.style.backgroundSize = 'cover';

      const container = document.querySelector('.map-container');
      container?.appendChild(entity);

      animateEntity(entity, selected).then(() => {
        setTimeout(() => {
          entity.remove();
        }, 1000);
      });
    }
  }, 10000);

  onDestroy(() => clearInterval(interval));
</script>

<div
  class="absolute z-40 pointer-events-none h-[2048px] w-[2048px] map-container"
></div>
