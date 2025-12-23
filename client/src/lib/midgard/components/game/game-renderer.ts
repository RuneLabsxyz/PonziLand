import { GAME_CONFIG, type GameState } from './game-types';

// PonziLand theme colors
const COLORS = {
  background: '#1a1625',
  bird: '#a855f7',
  birdEye: '#ffffff',
  birdPupil: '#000000',
  pipe: '#136a88',
  pipeOutline: '#071f2d',
  text: '#dfdfe3',
  scoreText: '#22d3ee',
  gameOverOverlay: 'rgba(0, 0, 0, 0.7)',
};

export function createRenderer(ctx: CanvasRenderingContext2D) {
  function render(state: GameState) {
    // Clear canvas
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Draw pipes
    for (const pipe of state.pipes) {
      drawPipe(pipe.x, pipe.gapY);
    }

    // Draw bird
    drawBird(state.bird.y, state.bird.velocity);

    // Draw score overlay
    drawScore(state.score);

    // Draw game over overlay
    if (state.gameOver) {
      drawGameOver(state.score);
    }
  }

  function drawBird(y: number, velocity: number) {
    const x = GAME_CONFIG.BIRD_X;
    const size = GAME_CONFIG.BIRD_SIZE;

    // Calculate rotation based on velocity
    const rotation = Math.min(Math.max(velocity * 0.05, -0.5), 0.5);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    // Bird body
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Bird eye (white)
    ctx.fillStyle = COLORS.birdEye;
    ctx.beginPath();
    ctx.arc(8, -5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Bird pupil
    ctx.fillStyle = COLORS.birdPupil;
    ctx.beginPath();
    ctx.arc(10, -5, 3, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(size / 2 - 2, 0);
    ctx.lineTo(size / 2 + 8, 3);
    ctx.lineTo(size / 2 - 2, 6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawPipe(x: number, gapY: number) {
    const gapTop = gapY - GAME_CONFIG.PIPE_GAP / 2;
    const gapBottom = gapY + GAME_CONFIG.PIPE_GAP / 2;
    const pipeWidth = GAME_CONFIG.PIPE_WIDTH;

    ctx.fillStyle = COLORS.pipe;
    ctx.strokeStyle = COLORS.pipeOutline;
    ctx.lineWidth = 3;

    // Top pipe
    ctx.fillRect(x, 0, pipeWidth, gapTop);
    ctx.strokeRect(x, 0, pipeWidth, gapTop);

    // Top pipe cap
    ctx.fillRect(x - 5, gapTop - 20, pipeWidth + 10, 20);
    ctx.strokeRect(x - 5, gapTop - 20, pipeWidth + 10, 20);

    // Bottom pipe
    ctx.fillRect(x, gapBottom, pipeWidth, GAME_CONFIG.HEIGHT - gapBottom);
    ctx.strokeRect(x, gapBottom, pipeWidth, GAME_CONFIG.HEIGHT - gapBottom);

    // Bottom pipe cap
    ctx.fillRect(x - 5, gapBottom, pipeWidth + 10, 20);
    ctx.strokeRect(x - 5, gapBottom, pipeWidth + 10, 20);
  }

  function drawScore(score: number) {
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${score} / ${GAME_CONFIG.MAX_SCORE}`,
      GAME_CONFIG.WIDTH / 2,
      40,
    );
  }

  function drawGameOver(score: number) {
    // Overlay
    ctx.fillStyle = COLORS.gameOverOverlay;
    ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Game Over text
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'GAME OVER',
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 - 30,
    );

    // Final score
    ctx.fillStyle = COLORS.scoreText;
    ctx.font = 'bold 48px monospace';
    ctx.fillText(
      `${score}`,
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 30,
    );

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = COLORS.text;
    ctx.fillText('points', GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT / 2 + 55);
  }

  function drawReady() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

    // Draw bird at center
    drawBird(GAME_CONFIG.HEIGHT / 2, 0);

    // Instructions
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Click or press SPACE',
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 80,
    );
    ctx.fillText(
      'to flap!',
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT / 2 + 105,
    );
  }

  return {
    render,
    drawReady,
  };
}

export type GameRenderer = ReturnType<typeof createRenderer>;
