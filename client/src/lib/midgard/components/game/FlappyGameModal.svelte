<script lang="ts">
  import { Card } from '$lib/components/ui/card';
  import { Button } from '$lib/components/ui/button';
  import CloseButton from '$lib/components/ui/close-button.svelte';
  import FlappyGameCanvas from './FlappyGameCanvas.svelte';
  import type { GamePhase } from './game-types';

  interface Props {
    visible: boolean;
    onClose: () => void;
    onScoreSubmit: (score: number) => void;
    title?: string;
  }

  let {
    visible,
    onClose,
    onScoreSubmit,
    title = 'Play Game',
  }: Props = $props();

  let gamePhase = $state<GamePhase>('ready');
  let score = $state(0);
  let gameCanvas: FlappyGameCanvas;

  function handleClose() {
    resetGame();
    onClose();
  }

  function startGame() {
    gamePhase = 'playing';
    gameCanvas?.focus();
  }

  function handleGameOver() {
    // gamePhase is already set to 'gameover' by the canvas component
  }

  function restartGame() {
    gameCanvas?.reset();
    gamePhase = 'ready';
    score = 0;
  }

  function resetGame() {
    gameCanvas?.reset();
    gamePhase = 'ready';
    score = 0;
  }

  function submitScore() {
    const finalScore = score;
    resetGame();
    onScoreSubmit(finalScore);
  }

  // Reset and focus when modal becomes visible
  $effect(() => {
    if (visible) {
      resetGame();
      // Focus canvas after it renders
      setTimeout(() => {
        gameCanvas?.focus();
      }, 50);
    }
  });
</script>

{#if visible}
  <div
    class="fixed inset-0 bg-black opacity-60 z-[99]"
    onclick={handleClose}
    onkeydown={(e) => e.key === 'Escape' && handleClose()}
    role="button"
    tabindex="-1"
    aria-label="Close modal"
  ></div>
  <Card
    class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[100] p-6 bg-ponzi min-w-[450px]"
  >
    <CloseButton onclick={handleClose} />

    <h2 class="text-xl font-semibold text-purple-400 mb-4 text-center">
      {title}
    </h2>

    <div class="flex justify-center">
      <FlappyGameCanvas
        bind:this={gameCanvas}
        bind:gamePhase
        bind:score
        onGameOver={handleGameOver}
        onStart={startGame}
      />
    </div>

    <div class="mt-4">
      {#if gamePhase === 'ready'}
        <div class="text-center">
          <p class="text-gray-400 text-sm mb-3">
            Press SPACE or click to start. Pass pipes to earn points.
          </p>
          <Button variant="blue" class="w-full" onclick={startGame}>
            Start Game
          </Button>
        </div>
      {:else if gamePhase === 'playing'}
        <div class="text-center">
          <div class="font-ponzi-number text-2xl text-cyan-400">
            Score: {score}
          </div>
        </div>
      {:else if gamePhase === 'gameover'}
        <div class="text-center">
          <div class="font-ponzi-number text-3xl text-purple-400 mb-4">
            Final Score: {score}
          </div>
          <div class="flex gap-3 justify-center">
            <Button variant="blue" onclick={restartGame}>Play Again</Button>
            <Button
              variant="blue"
              class="bg-green-600 hover:bg-green-500"
              onclick={submitScore}
            >
              Use Score ({score})
            </Button>
          </div>
        </div>
      {/if}
    </div>
  </Card>
{/if}
