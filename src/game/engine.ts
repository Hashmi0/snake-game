import {
  BOARD_SIZE,
  type Cell,
  type Direction,
  type GameCommand,
  type GameEvent,
  type GameState,
  type Random,
  type Speed,
} from './types';

const vectors: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const opposite: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

function sameCell(a: Cell, b: Cell): boolean {
  return a.x === b.x && a.y === b.y;
}

/** Enumerating free cells gives uniform placement and terminates on a full board. */
export function freeFood(snake: readonly Cell[], random: Random = Math.random): Cell | null {
  const occupied = new Set(snake.map(({ x, y }) => y * BOARD_SIZE + x));
  const free: Cell[] = [];
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (!occupied.has(y * BOARD_SIZE + x)) free.push({ x, y });
    }
  }
  if (free.length === 0) return null;
  return free[Math.floor(random() * free.length)]!;
}

export function createGame(speed: Speed = 'classic', random: Random = Math.random): GameState {
  const center = Math.floor(BOARD_SIZE / 2);
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
  return {
    snake,
    direction: 'right',
    queue: [],
    food: freeFood(snake, random),
    score: 0,
    speed,
    status: 'ready',
  };
}

/** Apply intent without advancing time or mutating an earlier render snapshot. */
export function command(
  state: GameState,
  action: GameCommand,
  random: Random = Math.random,
): GameState {
  switch (action.type) {
    case 'restart':
      return createGame(action.speed ?? state.speed, random);
    case 'start':
      return state.status === 'ready' ? { ...state, queue: [], status: 'running' } : state;
    case 'pause':
      return state.status === 'running' ? { ...state, queue: [], status: 'paused' } : state;
    case 'resume':
      return state.status === 'paused' ? { ...state, queue: [], status: 'running' } : state;
    case 'turn': {
      if (state.status !== 'running' || state.queue.length >= 2) return state;
      const previous = state.queue[state.queue.length - 1] ?? state.direction;
      if (action.direction === previous || action.direction === opposite[previous]) return state;
      return { ...state, queue: [...state.queue, action.direction] };
    }
  }
}

export function step(
  state: GameState,
  random: Random = Math.random,
): { state: GameState; events: GameEvent[] } {
  if (state.status !== 'running') return { state, events: [] };

  const direction = state.queue[0] ?? state.direction;
  const vector = vectors[direction];
  const head = state.snake[0]!;
  const next = { x: head.x + vector.x, y: head.y + vector.y };
  const growing = state.food !== null && sameCell(next, state.food);
  const obstacleCount = state.snake.length - (growing ? 0 : 1);
  const hitsWall = next.x < 0 || next.y < 0 || next.x >= BOARD_SIZE || next.y >= BOARD_SIZE;
  const hitsSnake = state.snake.slice(0, obstacleCount).some((cell) => sameCell(cell, next));

  if (hitsWall || hitsSnake) {
    return {
      state: { ...state, direction, queue: [], status: 'game-over' },
      events: [{ type: 'collision', cell: next }],
    };
  }

  const snake = [next, ...(growing ? state.snake : state.snake.slice(0, -1))];
  const events: GameEvent[] = [];
  let food = state.food;
  let status: GameState['status'] = state.status;
  if (growing) {
    events.push({ type: 'eat', cell: next });
    food = freeFood(snake, random);
    if (food === null) {
      status = 'won';
      events.push({ type: 'victory' });
    }
  }

  return {
    state: {
      ...state,
      snake,
      direction,
      queue: status === 'won' ? [] : state.queue.slice(1),
      food,
      score: state.score + (growing ? 10 : 0),
      status,
    },
    events,
  };
}
