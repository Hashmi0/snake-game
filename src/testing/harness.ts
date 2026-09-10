import { createGame } from '../game/engine';
import type { Cell, GameState, Random } from '../game/types';

interface Host {
  getState(): GameState;
  setState(state: GameState): void;
  setRandom(random: Random): void;
  setManual(manual: boolean): void;
  tick(): void;
  advance(milliseconds: number): void;
}
export interface TestHarness {
  state(): GameState;
  scenario(name: 'eat' | 'wall' | 'long' | 'ready', length?: number): void;
  ticks(count?: number): void;
  advance(milliseconds: number): void;
  automatic(enabled: boolean): void;
}
declare global { interface Window { __snakeGarden: TestHarness } }

export function installHarness(host: Host) {
  host.setManual(true);
  let seed = 123456;
  host.setRandom(() => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; });
  window.__snakeGarden = {
    state: () => structuredClone(host.getState()),
    scenario(name, length = 3) {
      const state = createGame('classic', () => .4);
      state.status = name === 'ready' ? 'ready' : 'running';
      if (name === 'eat') state.food = { x: 11, y: 10 };
      if (name === 'wall') state.snake = [{ x: 19, y: 10 }, { x: 18, y: 10 }, { x: 17, y: 10 }];
      if (name === 'long') {
        const path: Cell[] = [];
        for (let y = 0; y < 20; y++) for (let column = 0; column < 20; column++) path.push({ x: y % 2 ? 19 - column : column, y });
        state.snake = path.slice(0, length).reverse();
        state.direction = state.snake[0].y % 2 ? 'left' : 'right';
        state.food = path[length] ?? null;
      }
      host.setState(state);
    },
    ticks(count = 1) { for (let i = 0; i < count; i++) host.tick(); },
    advance: host.advance,
    automatic: enabled => host.setManual(!enabled),
  };
}
