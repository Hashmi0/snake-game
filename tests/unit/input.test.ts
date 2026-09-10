import { describe, expect, it } from 'vitest';
import { swipeDirection } from '../../src/platform/input';

describe('swipe direction', () => {
  it('ignores a tap or movement below 20 CSS pixels', () => {
    expect(swipeDirection(0, 0)).toBeNull();
    expect(swipeDirection(19.9, 0)).toBeNull();
    expect(swipeDirection(0, -19.9)).toBeNull();
    expect(swipeDirection(19, 18)).toBeNull();
  });

  it.each([
    [20, 0, 'right'], [-20, 0, 'left'], [0, 20, 'down'], [0, -20, 'up'],
    [65, -24, 'right'], [-65, 24, 'left'], [-24, 65, 'down'], [24, -65, 'up'],
  ] as const)('turns (%s, %s) into %s as soon as the threshold is crossed', (dx, dy, direction) => {
    expect(swipeDirection(dx, dy)).toBe(direction);
  });

  it('waits for a dominant axis on diagonals', () => {
    expect(swipeDirection(20, 20)).toBeNull();
    expect(swipeDirection(-40, 40)).toBeNull();
    expect(swipeDirection(-40, 41)).toBe('down');
  });

  it('ignores invalid coordinates', () => {
    expect(swipeDirection(Number.NaN, 40)).toBeNull();
    expect(swipeDirection(40, Infinity)).toBeNull();
  });
});
