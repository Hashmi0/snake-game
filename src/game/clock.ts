/** Fixed simulation steps; browser frame frequency never determines game speed. */
export class FixedClock {
  private previous: number | null = null;
  private accumulator = 0;

  reset(): void {
    this.previous = null;
    this.accumulator = 0;
  }

  advance(nowMs: number, stepMs: number, running: boolean, tick: () => void): number {
    if (!running || !Number.isFinite(nowMs)) {
      this.reset();
      return 0;
    }
    if (!Number.isFinite(stepMs) || stepMs <= 0) {
      throw new RangeError('The simulation step must be a positive, finite duration.');
    }
    if (this.previous === null) {
      this.previous = nowMs;
      return 0;
    }

    this.accumulator += Math.max(0, nowMs - this.previous);
    this.previous = nowMs;
    let ticks = 0;
    // Small tolerance avoids losing ticks to floating-point rounding at 12 Hz.
    while (this.accumulator + stepMs * 1e-10 >= stepMs && ticks < 2) {
      this.accumulator = Math.max(0, this.accumulator - stepMs);
      ticks += 1;
      tick();
    }
    // Retain only fractional progress, never a backlog after a long frame.
    if (this.accumulator >= stepMs) this.accumulator %= stepMs;
    return this.accumulator / stepMs;
  }
}
