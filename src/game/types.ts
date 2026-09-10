export type Direction = 'up' | 'down' | 'left' | 'right';
export type Speed = 'relaxed' | 'classic' | 'fast';
export type Status = 'ready' | 'running' | 'paused' | 'game-over' | 'won';
export interface Cell { x: number; y: number }
export interface GameState {
  snake: Cell[];
  direction: Direction;
  queue: Direction[];
  food: Cell | null;
  score: number;
  speed: Speed;
  status: Status;
}
export type GameCommand =
  | { type: 'turn'; direction: Direction }
  | { type: 'start' | 'pause' | 'resume' }
  | { type: 'restart'; speed?: Speed };
export type GameEvent =
  | { type: 'eat'; cell: Cell }
  | { type: 'collision'; cell: Cell }
  | { type: 'victory' };
export type Random = () => number;
export const BOARD_SIZE = 20;
export const SPEEDS: Record<Speed, number> = { relaxed: 5, classic: 8, fast: 12 };
