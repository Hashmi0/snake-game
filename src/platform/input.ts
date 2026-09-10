import type { Direction } from '../game/types';

const SWIPE_THRESHOLD = 20;
const KEY_DIRECTIONS: Readonly<Record<string, Direction>> = {
  arrowup: 'up', w: 'up',
  arrowdown: 'down', s: 'down',
  arrowleft: 'left', a: 'left',
  arrowright: 'right', d: 'right',
};

/** Coordinates are CSS pixels; screen-positive Y points down. */
export function swipeDirection(dx: number, dy: number): Direction | null {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null;
  const x = Math.abs(dx);
  const y = Math.abs(dy);
  if (Math.max(x, y) < SWIPE_THRESHOLD || x === y) return null;
  return x > y ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
}

export function bindInput(
  surface: HTMLElement,
  onDirection: (direction: Direction) => void,
  onAction: (action: 'toggle-pause' | 'confirm') => void,
): { clear(): void; dispose(): void } {
  const keyboardTarget = surface.ownerDocument.defaultView ?? window;
  let gesture: { id: number; x: number; y: number; fired: boolean } | null = null;

  function clear(): void {
    const previous = gesture;
    gesture = null;
    if (!previous) return;
    try {
      if (surface.hasPointerCapture(previous.id)) surface.releasePointerCapture(previous.id);
    } catch {
      // Cancellation or page lifecycle changes can already have released capture.
    }
  }

  function keydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    const target = event.target;
    if (target instanceof Element && target.closest(
      'button,input,select,textarea,a,[contenteditable]:not([contenteditable="false"]),[role="button"]',
    )) return;
    const key = event.key.toLowerCase();
    const direction = Object.hasOwn(KEY_DIRECTIONS, key) ? KEY_DIRECTIONS[key] : undefined;
    if (direction) {
      event.preventDefault();
      if (event.repeat) return;
      onDirection(direction);
    } else if (key === ' ' || key === 'enter') {
      event.preventDefault();
      if (event.repeat) return;
      onAction(key === ' ' ? 'toggle-pause' : 'confirm');
    }
  }

  function pointerdown(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0 || gesture) return;
    // A menu can sit over the board; capturing its buttons would steal clicks.
    if (event.target instanceof Element && event.target.closest('button,input,select,textarea,a')) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, fired: false };
    try {
      surface.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events and interrupted pointers may not support capture.
    }
  }

  function pointermove(event: PointerEvent): void {
    if (!gesture || gesture.id !== event.pointerId || gesture.fired) return;
    const direction = swipeDirection(event.clientX - gesture.x, event.clientY - gesture.y);
    if (!direction) return;
    gesture.fired = true;
    onDirection(direction);
  }

  function pointerend(event: PointerEvent): void {
    if (gesture?.id === event.pointerId) clear();
  }

  keyboardTarget.addEventListener('keydown', keydown);
  surface.addEventListener('pointerdown', pointerdown);
  surface.addEventListener('pointermove', pointermove);
  surface.addEventListener('pointerup', pointerend);
  surface.addEventListener('pointercancel', pointerend);
  surface.addEventListener('lostpointercapture', pointerend);

  return {
    clear,
    dispose() {
      clear();
      keyboardTarget.removeEventListener('keydown', keydown);
      surface.removeEventListener('pointerdown', pointerdown);
      surface.removeEventListener('pointermove', pointermove);
      surface.removeEventListener('pointerup', pointerend);
      surface.removeEventListener('pointercancel', pointerend);
      surface.removeEventListener('lostpointercapture', pointerend);
    },
  };
}
