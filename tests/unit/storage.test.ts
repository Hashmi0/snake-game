import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadPreferences, savePreferences } from '../../src/platform/storage';

class MemoryStorage implements Storage {
  private readonly entries = new Map<string, string>();
  get length(): number { return this.entries.size; }
  clear(): void { this.entries.clear(); }
  getItem(key: string): string | null { return this.entries.get(key) ?? null; }
  key(index: number): string | null { return [...this.entries.keys()][index] ?? null; }
  removeItem(key: string): void { this.entries.delete(key); }
  setItem(key: string, value: string): void { this.entries.set(key, value); }
}

const defaultPreferences = { best: { relaxed: 0, classic: 0, fast: 0 }, muted: false };

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('preferences', () => {
  it('starts with independent defaults when nothing has been saved', () => {
    const storage = new MemoryStorage();
    const first = loadPreferences(storage);
    expect(first).toEqual(defaultPreferences);
    first.best.fast = 500;
    expect(loadPreferences(storage)).toEqual(defaultPreferences);
  });

  it('round-trips scores separately by speed and the mute preference', () => {
    const storage = new MemoryStorage();
    const preferences = { best: { relaxed: 20, classic: 150, fast: 90 }, muted: true };
    savePreferences(preferences, storage);
    expect(loadPreferences(storage)).toEqual(preferences);
    expect(storage.key(0)).toBe('snake-garden:v1');
  });

  it.each(['{broken', 'null', '42', '[]', '"text"'])('recovers from malformed saved data: %s', raw => {
    const storage = new MemoryStorage();
    storage.setItem('snake-garden:v1', raw);
    expect(loadPreferences(storage)).toEqual(defaultPreferences);
  });

  it('retains valid fields while rejecting invalid scores and mute values', () => {
    const storage = new MemoryStorage();
    storage.setItem('snake-garden:v1', JSON.stringify({
      best: { relaxed: -10, classic: 120, fast: '80' }, muted: 'false',
    }));
    expect(loadPreferences(storage)).toEqual({ best: { relaxed: 0, classic: 120, fast: 0 }, muted: false });
  });

  it.each(['1e400', '-1', '2.5', '9007199254740992', 'null'])('rejects nonfinite or invalid scores: %s', rawScore => {
    const storage = new MemoryStorage();
    storage.setItem('snake-garden:v1', `{"best":{"classic":${rawScore}},"muted":true}`);
    expect(loadPreferences(storage)).toEqual({ ...defaultPreferences, muted: true });
  });

  it('does not let storage read or quota failures escape', () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, 'getItem').mockImplementation(() => { throw new Error('Storage denied'); });
    vi.spyOn(storage, 'setItem').mockImplementation(() => { throw new Error('Quota exceeded'); });
    expect(loadPreferences(storage)).toEqual(defaultPreferences);
    expect(() => savePreferences(defaultPreferences, storage)).not.toThrow();
  });

  it('survives an unavailable localStorage global', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(loadPreferences()).toEqual(defaultPreferences);
    expect(() => savePreferences(defaultPreferences)).not.toThrow();
  });

  it('survives browsers whose localStorage property getter throws', () => {
    vi.stubGlobal('localStorage', undefined);
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() { throw new Error('SecurityError'); },
    });
    expect(loadPreferences()).toEqual(defaultPreferences);
    expect(() => savePreferences(defaultPreferences)).not.toThrow();
  });
});
