<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createGameEngine } from './game-engine';
  import { createRenderer } from './game-renderer';
  import { GAME_CONFIG, type GamePhase } from './game-types';

  interface Props {
    gamePhase: GamePhase;
    score: number;
    onGameOver: () => void;
    onStart: () => void;
  }

  let {
    gamePhase = $bindable(),
    score = $bindable(),
    onGameOver,
    onStart,
  }: Props = $props();

  let canvas: HTMLCanvasElement;
  let gameEngine: ReturnType<typeof createGameEngine>;
  let renderer: ReturnType<typeof createRenderer>;
  let animationFrameId: number;

  onMount(() => {
    const ctx = canvas.getContext('2d')!;
    renderer = createRenderer(ctx);
    gameEngine = createGameEngine();

    // Initial draw
    renderer.drawReady();

    // Game loop
    function gameLoop() {
      if (gamePhase === 'playing') {
        const state = gameEngine.update();
        score = state.score;

        if (state.gameOver) {
          gamePhase = 'gameover';
          onGameOver();
        }

        renderer.render(state);
      } else if (gamePhase === 'ready') {
        renderer.drawReady();
      }

      animationFrameId = requestAnimationFrame(gameLoop);
    }

    animationFrameId = requestAnimationFrame(gameLoop);
  });

  onDestroy(() => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
  });

  // Track previous phase to detect when game starts
  let previousPhase: GamePhase = 'ready';

  // Auto-flap when game starts
  $effect(() => {
    if (previousPhase === 'ready' && gamePhase === 'playing' && gameEngine) {
      gameEngine.flap();
    }
    previousPhase = gamePhase;
  });

  export function flap() {
    if (gamePhase === 'playing' && gameEngine) {
      gameEngine.flap();
    }
  }

  export function reset() {
    if (gameEngine) {
      gameEngine.reset();
      score = 0;
    }
  }

  export function focus() {
    canvas?.focus();
  }

  function handleInput(e: Event) {
    e.preventDefault();
    if (gamePhase === 'ready') {
      onStart();
    } else if (gamePhase === 'playing') {
      flap();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (gamePhase === 'ready') {
        onStart();
      } else if (gamePhase === 'playing') {
        flap();
      }
    }
  }
</script>

<canvas
  bind:this={canvas}
  width={GAME_CONFIG.WIDTH}
  height={GAME_CONFIG.HEIGHT}
  class="rounded-lg cursor-pointer outline-none"
  onclick={handleInput}
  onkeydown={handleKeydown}
  tabindex="0"
  aria-label="Flappy Bird game"
></canvas>
