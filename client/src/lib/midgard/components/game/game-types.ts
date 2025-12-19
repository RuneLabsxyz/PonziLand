export interface GameConfig {
  WIDTH: number;
  HEIGHT: number;
  BIRD_SIZE: number;
  BIRD_X: number;
  GRAVITY: number;
  FLAP_FORCE: number;
  MAX_FALL_SPEED: number;
  PIPE_WIDTH: number;
  PIPE_GAP: number;
  PIPE_SPEED: number;
  PIPE_SPAWN_INTERVAL: number;
  MAX_SCORE: number;
}

export interface Bird {
  y: number;
  velocity: number;
}

export interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

export interface GameState {
  bird: Bird;
  pipes: Pipe[];
  score: number;
  gameOver: boolean;
  frameCount: number;
}

export type GamePhase = 'ready' | 'playing' | 'gameover';

export const GAME_CONFIG: GameConfig = {
  WIDTH: 400,
  HEIGHT: 500,
  BIRD_SIZE: 30,
  BIRD_X: 80,
  GRAVITY: 0.5,
  FLAP_FORCE: -8,
  MAX_FALL_SPEED: 10,
  PIPE_WIDTH: 60,
  PIPE_GAP: 150,
  PIPE_SPEED: 3,
  PIPE_SPAWN_INTERVAL: 90,
  MAX_SCORE: 100,
};
