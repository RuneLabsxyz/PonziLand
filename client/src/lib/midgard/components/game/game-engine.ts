import { GAME_CONFIG, type GameState } from './game-types';

export function createGameEngine() {
  let state: GameState = createInitialState();

  function createInitialState(): GameState {
    return {
      bird: { y: GAME_CONFIG.HEIGHT / 2, velocity: 0 },
      pipes: [],
      score: 0,
      gameOver: false,
      frameCount: 0,
    };
  }

  function update(): GameState {
    if (state.gameOver || state.score >= GAME_CONFIG.MAX_SCORE) {
      state.gameOver = true;
      return state;
    }

    state.frameCount++;

    // Update bird physics
    state.bird.velocity = Math.min(
      state.bird.velocity + GAME_CONFIG.GRAVITY,
      GAME_CONFIG.MAX_FALL_SPEED,
    );
    state.bird.y += state.bird.velocity;

    // Spawn pipes
    if (state.frameCount % GAME_CONFIG.PIPE_SPAWN_INTERVAL === 0) {
      spawnPipe();
    }

    // Update pipes
    updatePipes();

    // Check collisions
    if (checkCollisions()) {
      state.gameOver = true;
    }

    return state;
  }

  function flap(): void {
    if (!state.gameOver) {
      state.bird.velocity = GAME_CONFIG.FLAP_FORCE;
    }
  }

  function spawnPipe(): void {
    const minY = 100;
    const maxY = GAME_CONFIG.HEIGHT - 100;
    const gapY = minY + Math.random() * (maxY - minY);

    state.pipes.push({
      x: GAME_CONFIG.WIDTH,
      gapY,
      passed: false,
    });
  }

  function updatePipes(): void {
    state.pipes = state.pipes.filter((pipe) => {
      pipe.x -= GAME_CONFIG.PIPE_SPEED;

      // Score when passing pipe
      if (
        !pipe.passed &&
        pipe.x + GAME_CONFIG.PIPE_WIDTH < GAME_CONFIG.BIRD_X
      ) {
        pipe.passed = true;
        state.score = Math.min(state.score + 1, GAME_CONFIG.MAX_SCORE);
      }

      return pipe.x > -GAME_CONFIG.PIPE_WIDTH;
    });
  }

  function checkCollisions(): boolean {
    const bird = state.bird;
    const birdBox = {
      left: GAME_CONFIG.BIRD_X - GAME_CONFIG.BIRD_SIZE / 2,
      right: GAME_CONFIG.BIRD_X + GAME_CONFIG.BIRD_SIZE / 2,
      top: bird.y - GAME_CONFIG.BIRD_SIZE / 2,
      bottom: bird.y + GAME_CONFIG.BIRD_SIZE / 2,
    };

    // Ceiling/floor collision
    if (birdBox.top <= 0 || birdBox.bottom >= GAME_CONFIG.HEIGHT) {
      return true;
    }

    // Pipe collision
    for (const pipe of state.pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + GAME_CONFIG.PIPE_WIDTH;
      const gapTop = pipe.gapY - GAME_CONFIG.PIPE_GAP / 2;
      const gapBottom = pipe.gapY + GAME_CONFIG.PIPE_GAP / 2;

      // Check horizontal overlap
      if (birdBox.right > pipeLeft && birdBox.left < pipeRight) {
        // Check if bird is outside the gap
        if (birdBox.top < gapTop || birdBox.bottom > gapBottom) {
          return true;
        }
      }
    }

    return false;
  }

  function reset(): void {
    state = createInitialState();
  }

  function getState(): GameState {
    return state;
  }

  return {
    update,
    flap,
    reset,
    getState,
  };
}

export type GameEngine = ReturnType<typeof createGameEngine>;
