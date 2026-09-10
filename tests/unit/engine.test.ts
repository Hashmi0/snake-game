import { describe, expect, it, vi } from 'vitest';
import { command, createGame, freeFood, step } from '../../src/game/engine';
import { BOARD_SIZE, type GameState, type Status } from '../../src/game/types';

const zero = () => 0;
const running = (overrides: Partial<GameState> = {}): GameState => ({
  ...command(createGame('classic', zero), { type: 'start' }),
  ...overrides,
});

describe('simulation rules', () => {
  it('starts centered, three cells long, facing right with deterministic food', () => {
    expect(createGame('classic', zero)).toEqual({
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      direction: 'right', queue: [], food: { x: 0, y: 0 }, score: 0,
      speed: 'classic', status: 'ready',
    });
  });

  it('advances one cell, preserves length and does not mutate prior snapshots', () => {
    const before = running();
    const copy = structuredClone(before);
    const result = step(before);
    expect(result.state.snake).toEqual([{ x: 11, y: 10 }, { x: 10, y: 10 }, { x: 9, y: 10 }]);
    expect(result.events).toEqual([]);
    expect(before).toEqual(copy);
  });

  it('grows once, awards ten points, and replaces eaten food outside the snake', () => {
    const before = running({ food: { x: 11, y: 10 }, score: 20 });
    const result = step(before, zero);
    expect(result.state.snake).toHaveLength(4);
    expect(result.state.snake.at(-1)).toEqual({ x: 8, y: 10 });
    expect(result.state.score).toBe(30);
    expect(result.state.food).toEqual({ x: 0, y: 0 });
    expect(result.events).toEqual([{ type: 'eat', cell: { x: 11, y: 10 } }]);
    expect(before.score).toBe(20);
  });

  it.each([
    ['left', 0, 10, -1, 10], ['right', 19, 10, 20, 10],
    ['up', 10, 0, 10, -1], ['down', 10, 19, 10, 20],
  ] as const)('ends at the %s wall without advancing the snake through it', (direction, x, y, nextX, nextY) => {
    const before = running({ snake: [{ x, y }], direction });
    const result = step(before);
    expect(result.state.status).toBe('game-over');
    expect(result.state.snake).toEqual(before.snake);
    expect(result.state.queue).toEqual([]);
    expect(result.events).toEqual([{ type: 'collision', cell: { x: nextX, y: nextY } }]);
  });

  it('ends when turning into a body cell', () => {
    const before = running({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }],
      queue: ['up', 'left'],
    });
    expect(step(before).state.status).toBe('game-over');
  });

  it('permits entering a tail cell that departs during this tick', () => {
    const result = step(running({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }],
      queue: ['up'],
    }));
    expect(result.state.status).toBe('running');
    expect(result.state.snake[0]).toEqual({ x: 5, y: 4 });
    expect(result.state.snake).toHaveLength(4);
  });

  it('wins when eating fills the board, without requesting random food', () => {
    const all = Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, i) => ({ x: i % BOARD_SIZE, y: Math.floor(i / BOARD_SIZE) }));
    const snake = [{ x: 18, y: 19 }, ...all.filter(({ x, y }) => !(y === 19 && x >= 18))];
    const random = vi.fn(zero);
    const result = step(running({ snake, food: { x: 19, y: 19 }, queue: ['right'] }), random);
    expect(result.state.status).toBe('won');
    expect(result.state.snake).toHaveLength(400);
    expect(result.state.food).toBeNull();
    expect(result.state.queue).toEqual([]);
    expect(result.events).toEqual([{ type: 'eat', cell: { x: 19, y: 19 } }, { type: 'victory' }]);
    expect(random).not.toHaveBeenCalled();
  });

  it('selects every free cell with equal-sized random intervals', () => {
    const snake = createGame('classic', zero).snake;
    const count = BOARD_SIZE * BOARD_SIZE - snake.length;
    const selected = new Set<string>();
    for (let i = 0; i < count; i += 1) {
      const food = freeFood(snake, () => (i + 0.5) / count)!;
      expect(snake).not.toContainEqual(food);
      selected.add(`${food.x},${food.y}`);
    }
    expect(selected.size).toBe(count);
  });

  it.each(['ready', 'paused', 'game-over', 'won'] as Status[])('never advances a %s game', (status) => {
    const before = running({ status });
    expect(step(before)).toEqual({ state: before, events: [] });
    expect(command(before, { type: 'turn', direction: 'up' })).toBe(before);
  });
});

describe('commands and input queue', () => {
  it('ignores duplicate and reverse directions without mutating input', () => {
    const before = running();
    expect(command(before, { type: 'turn', direction: 'right' })).toBe(before);
    expect(command(before, { type: 'turn', direction: 'left' })).toBe(before);
    const queued = command(before, { type: 'turn', direction: 'up' });
    expect(command(queued, { type: 'turn', direction: 'up' })).toBe(queued);
    expect(command(queued, { type: 'turn', direction: 'down' })).toBe(queued);
    expect(before.queue).toEqual([]);
  });

  it('accepts up then left while moving right, and applies one turn per tick', () => {
    const up = command(running(), { type: 'turn', direction: 'up' });
    const left = command(up, { type: 'turn', direction: 'left' });
    expect(left.queue).toEqual(['up', 'left']);
    expect(command(left, { type: 'turn', direction: 'down' })).toBe(left);
    const first = step(left).state;
    expect(first.snake[0]).toEqual({ x: 10, y: 9 });
    expect(first.queue).toEqual(['left']);
    const second = step(first).state;
    expect(second.snake[0]).toEqual({ x: 9, y: 9 });
    expect(second.queue).toEqual([]);
  });

  it('pauses and resumes without retaining old inputs or resetting score', () => {
    const before = running({ queue: ['up', 'left'], score: 50 });
    const paused = command(before, { type: 'pause' });
    expect(paused.status).toBe('paused');
    expect(paused.queue).toEqual([]);
    const resumed = command(paused, { type: 'resume' });
    expect(resumed.status).toBe('running');
    expect(resumed.score).toBe(50);
    expect(step(resumed).state.snake[0]).toEqual({ x: 11, y: 10 });
  });

  it('only starts ready games and resumes paused games', () => {
    const ready = createGame('classic', zero);
    expect(command(ready, { type: 'resume' })).toBe(ready);
    expect(command(ready, { type: 'pause' })).toBe(ready);
    expect(command(ready, { type: 'start' }).status).toBe('running');
    for (const status of ['running', 'paused', 'game-over', 'won'] as const) {
      const before = running({ status });
      expect(command(before, { type: 'start' })).toBe(before);
    }
  });

  it('restarts with a clean deterministic state and keeps speed unless explicitly changed', () => {
    const before = running({ queue: ['up'], score: 100, speed: 'fast', status: 'game-over' });
    expect(command(before, { type: 'restart' }, zero)).toEqual(createGame('fast', zero));
    expect(command(before, { type: 'restart', speed: 'relaxed' }, zero)).toEqual(createGame('relaxed', zero));
    expect(before.score).toBe(100);
  });
});
