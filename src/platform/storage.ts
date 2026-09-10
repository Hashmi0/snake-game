import type { Speed } from '../game/types';

export interface Preferences {
  best: Record<Speed, number>;
  muted: boolean;
}

const STORAGE_KEY = 'snake-garden:v1';
const SPEED_NAMES: Speed[] = ['relaxed', 'classic', 'fast'];

function defaults(): Preferences {
  return { best: { relaxed: 0, classic: 0, fast: 0 }, muted: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalize(value: unknown): Preferences {
  const result = defaults();
  if (!isRecord(value)) return result;
  if (typeof value.muted === 'boolean') result.muted = value.muted;
  if (isRecord(value.best)) {
    for (const speed of SPEED_NAMES) {
      const score = value.best[speed];
      if (typeof score === 'number' && Number.isSafeInteger(score) && score >= 0) {
        result.best[speed] = score;
      }
    }
  }
  return result;
}

export function loadPreferences(storage?: Storage): Preferences {
  try {
    // Access inside the try: restricted browsers can throw from the getter itself.
    const availableStorage = storage ?? globalThis.localStorage;
    const raw = availableStorage?.getItem(STORAGE_KEY);
    return raw ? normalize(JSON.parse(raw)) : defaults();
  } catch {
    return defaults();
  }
}

export function savePreferences(preferences: Preferences, storage?: Storage): void {
  try {
    const availableStorage = storage ?? globalThis.localStorage;
    availableStorage?.setItem(STORAGE_KEY, JSON.stringify(normalize(preferences)));
  } catch {
    // Private browsing, quota limits, or disabled storage must not interrupt a run.
  }
}
