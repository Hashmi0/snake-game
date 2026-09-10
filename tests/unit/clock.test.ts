import { describe, expect, it, vi } from 'vitest';
import { FixedClock } from '../../src/game/clock';
import { SPEEDS } from '../../src/game/types';

describe('fixed timestep clock', () => {
  it.each(Object.entries(SPEEDS))('runs %s at its specified rate regardless of frame rate', (_speed, rate) => {
    for (const frames of [30, 60, 120]) {
      const clock = new FixedClock();
      const tick = vi.fn();
      clock.advance(0, 1000 / rate, true, tick);
      for (let frame = 1; frame <= frames; frame += 1) {
        const alpha = clock.advance(frame * 1000 / frames, 1000 / rate, true, tick);
        expect(alpha).toBeGreaterThanOrEqual(0);
        expect(alpha).toBeLessThan(1);
      }
      expect(tick).toHaveBeenCalledTimes(rate);
    }
  });

  it('establishes a baseline before advancing and returns fractional progress', () => {
    const clock = new FixedClock();
    const tick = vi.fn();
    expect(clock.advance(5000, 125, true, tick)).toBe(0);
    expect(clock.advance(5062.5, 125, true, tick)).toBe(0.5);
    expect(tick).not.toHaveBeenCalled();
    expect(clock.advance(5125, 125, true, tick)).toBe(0);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('limits catch-up to two ticks and discards backlog after a long frame', () => {
    const clock = new FixedClock();
    const tick = vi.fn();
    clock.advance(0, 125, true, tick);
    expect(clock.advance(10_050, 125, true, tick)).toBeCloseTo(0.4);
    expect(tick).toHaveBeenCalledTimes(2);
    clock.advance(10_060, 125, true, tick);
    expect(tick).toHaveBeenCalledTimes(2);
    clock.advance(10_125, 125, true, tick);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it('discards accumulated progress while paused and re-baselines on resume', () => {
    const clock = new FixedClock();
    const tick = vi.fn();
    clock.advance(0, 125, true, tick);
    clock.advance(100, 125, true, tick);
    expect(clock.advance(105, 125, false, tick)).toBe(0);
    expect(clock.advance(50_000, 125, true, tick)).toBe(0);
    clock.advance(50_025, 125, true, tick);
    expect(tick).not.toHaveBeenCalled();
    clock.advance(50_125, 125, true, tick);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('explicit reset removes timing from the old run', () => {
    const clock = new FixedClock();
    const tick = vi.fn();
    clock.advance(0, 125, true, tick);
    clock.advance(100, 125, true, tick);
    clock.reset();
    expect(clock.advance(10_000, 125, true, tick)).toBe(0);
    clock.advance(10_025, 125, true, tick);
    expect(tick).not.toHaveBeenCalled();
  });

  it('allows a tick callback to stop catch-up by resetting the clock', () => {
    const clock = new FixedClock();
    const tick = vi.fn(() => clock.reset());
    clock.advance(0, 125, true, tick);
    expect(clock.advance(1000, 125, true, tick)).toBe(0);
    expect(tick).toHaveBeenCalledTimes(1);
  });
});
