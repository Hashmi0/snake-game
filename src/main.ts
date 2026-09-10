import '@fontsource/lilita-one/latin-400.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
import './style.css';
import { createGame, command, step } from './game/engine';
import { FixedClock } from './game/clock';
import { SPEEDS, type Direction, type GameState, type Speed, type GameCommand } from './game/types';
import { GardenRenderer } from './render/GardenRenderer';
import { bindInput } from './platform/input';
import { GardenAudio } from './platform/audio';
import { loadPreferences, savePreferences } from './platform/storage';
import { icon, logo } from './ui/icons';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="masthead">
    <a class="brand" href="./" aria-label="Snake Garden home">${logo}<span>snake garden</span></a>
    <div class="header-end"><span class="header-note">A little nostalgia. Freshly grown.</span><button id="sound" class="icon-button sound-button" aria-label="Turn sound off" aria-pressed="false">${icon('sound')}</button></div>
  </header>
  <main class="game-layout">
    <section class="intro" aria-labelledby="game-title">
      <h1 id="game-title">Small snake.<br><span>Big appetite.</span></h1>
      <p class="intro-copy">Your old favorite, with a fresh coat of green.<br class="desktop-break"> Take a breath. Take a bite.</p>
      <div class="game-controls">
        <fieldset class="speed-picker"><legend>Pick your pace</legend><div class="speed-options">
          <button class="speed-option" data-speed="relaxed" aria-pressed="false">Relaxed</button>
          <button class="speed-option selected" data-speed="classic" aria-pressed="true">Classic</button>
          <button class="speed-option" data-speed="fast" aria-pressed="false">Fast</button>
        </div><p id="speed-note" class="speed-note">A familiar rhythm. Room to grow.</p></fieldset>
        <div class="session-copy" aria-live="polite" aria-atomic="true"><h2 id="status-title">Ready to grow?</h2><p id="status-copy">A hungry little snake. A garden full of possibility.</p></div>
        <div class="session-actions"><button id="primary" class="primary-button">${icon('play')}<span>Start game</span></button><button id="restart" class="icon-button restart-button" aria-label="Restart game" hidden>${icon('restart')}</button></div>
        <div class="keyboard-hint"><span class="key-set"><kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd></span><span>to wander <span class="hint-divider">·</span> space to pause</span></div>
      </div>
    </section>
    <section class="garden" aria-label="Snake game">
      <div class="garden-toolbar">
        <div class="scores"><div class="score-block"><span class="score-label">SCORE</span><output id="score" aria-label="Score">00</output></div><div class="score-block best-block"><span class="score-label">${icon('trophy')} BEST</span><output id="best" aria-label="Best score">00</output></div></div>
        <div class="board-tools"><span id="game-state" class="state-label"><span class="status-dot"></span>Ready when you are</span><button id="pause" class="icon-button" aria-label="Pause game" disabled>${icon('pause')}</button></div>
      </div>
      <div id="play-surface" class="play-surface" tabindex="0" aria-label="Game board. Swipe or use arrow keys to steer. Avoid the walls and your tail." role="application">
        <canvas id="garden-canvas" aria-label="3D garden board"></canvas>
        <div id="graphics-error" class="graphics-error" role="alert" hidden><h2>Your garden needs a refresh.</h2><p id="graphics-message">Graphics are unavailable. Try a browser with hardware acceleration enabled.</p><button id="reload" class="primary-button">Reload game</button></div>
      </div>
      <div class="board-caption"><span>${icon('apple')} Eat. Grow. Go again.</span><span class="desktop-caption">20 × 20 little possibilities</span><span class="mobile-caption">Swipe to find your next bite</span></div>
    </section>
    <nav class="touch-controls" aria-label="Steering controls"><button data-direction="left" aria-label="Go left">${icon('left')}</button><div class="vertical-controls"><button data-direction="up" aria-label="Go up">${icon('up')}</button><button data-direction="down" aria-label="Go down">${icon('down')}</button></div><button data-direction="right" aria-label="Go right">${icon('right')}</button></nav>
  </main>
  <footer class="footer"><span>${icon('leaf')} No rush. Just one more little bite.</span><span>Keep growing.</span></footer>`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#garden-canvas');
const surface = $('#play-surface');
const primary = $<HTMLButtonElement>('#primary');
const pause = $<HTMLButtonElement>('#pause');
const restart = $<HTMLButtonElement>('#restart');
const sound = $<HTMLButtonElement>('#sound');
const preferences = loadPreferences();
const audio = new GardenAudio();
audio.setMuted(preferences.muted);
let selectedSpeed: Speed = 'classic';
let random = Math.random;
let state = createGame(selectedSpeed, random);
let previous = state;
let renderer: GardenRenderer | undefined;
let failed = false;
let manual = false;
let manualNow = 0;
let manualAlpha = 1;
let renderedStatus = '';
const clock = new FixedClock();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// The ready scene is a composed preview; every actual run starts with three cells.
const previewState: GameState = {
  ...createGame(),
  snake: [
    { x: 13, y: 8 }, { x: 12, y: 8 }, { x: 11, y: 8 }, { x: 10, y: 8 },
    { x: 9, y: 8 }, { x: 8, y: 8 }, { x: 8, y: 9 }, { x: 8, y: 10 },
    { x: 8, y: 11 }, { x: 9, y: 11 }, { x: 10, y: 11 }, { x: 11, y: 11 },
    { x: 11, y: 12 }, { x: 11, y: 13 }, { x: 10, y: 13 }, { x: 9, y: 13 },
  ], food: { x: 15, y: 7 },
};

function graphicsFailure(message: string) {
  failed = true;
  state = command(state, { type: 'pause' });
  clock.reset();
  $('#graphics-message').textContent = message;
  $('#graphics-error').hidden = false;
  primary.disabled = true;
  pause.disabled = true;
  restart.disabled = true;
  syncUI();
}

try {
  renderer = new GardenRenderer(canvas);
  renderer.setReducedMotion(reduceMotion.matches);
} catch {
  graphicsFailure('Graphics are unavailable. Enable hardware acceleration or try another browser, then reload.');
}

const input = bindInput(surface, turn, action => {
  if (action === 'confirm' && ['ready', 'game-over', 'won'].includes(state.status)) activate();
  if (action === 'toggle-pause' && ['running', 'paused'].includes(state.status)) activate();
});

function dispatch(action: GameCommand) {
  const beforeStatus = state.status;
  state = command(state, action, random);
  if (state.status !== beforeStatus || action.type === 'restart') {
    clock.reset();
    input.clear();
    previous = state;
    manualAlpha = 1;
  }
  syncUI();
}

function activate() {
  if (failed) return;
  audio.unlock();
  audio.play('ui');
  if (state.status === 'running') dispatch({ type: 'pause' });
  else if (state.status === 'paused') dispatch({ type: 'resume' });
  else {
    dispatch({ type: 'restart', speed: selectedSpeed });
    dispatch({ type: 'start' });
  }
  if (state.status === 'running') surface.focus({ preventScroll: true });
}

function turn(direction: Direction) {
  if (failed) return;
  audio.unlock();
  dispatch({ type: 'turn', direction });
}

function tick() {
  if (state.status !== 'running') return;
  previous = state;
  const result = step(state, random);
  state = result.state;
  renderer?.emit(result.events);
  for (const event of result.events) {
    audio.play(event.type);
  }
  if (state.score > preferences.best[state.speed]) {
    preferences.best[state.speed] = state.score;
    savePreferences(preferences);
  }
  if (state.status !== 'running') {
    clock.reset();
    input.clear();
    previous = state;
  }
  syncUI();
}

function syncUI() {
  $('#score').textContent = String(state.score).padStart(2, '0');
  $('#best').textContent = String(preferences.best[state.status === 'ready' ? selectedSpeed : state.speed]).padStart(2, '0');
  sound.setAttribute('aria-label', preferences.muted ? 'Turn sound on' : 'Turn sound off');
  sound.setAttribute('aria-pressed', String(preferences.muted));
  sound.innerHTML = icon(preferences.muted ? 'muted' : 'sound');
  const copy = {
    ready: ['Ready to grow?', 'A hungry little snake. A garden full of possibility.', 'Start game', 'Ready when you are', 'play'],
    running: ['Follow your appetite.', 'Find the fruit. Mind the edges. Enjoy the little things.', 'Pause game', 'A little adventure', 'pause'],
    paused: ['Take a little breather.', 'Your garden will be right here when you’re ready.', 'Resume game', 'Taking a breather', 'play'],
    'game-over': ['Room to grow.', `You gathered ${state.score} points. Every ending is a fresh start.`, 'Play again', 'Another bite?', 'restart'],
    won: ['What a beautiful garden.', 'Every little square, filled with possibility. You did it!', 'Play again', 'Fully grown!', 'restart'],
  }[state.status];
  $('#status-title').textContent = copy[0];
  $('#status-copy').textContent = copy[1];
  primary.innerHTML = `${icon(copy[4])}<span>${copy[2]}</span>`;
  primary.disabled = failed;
  pause.disabled = failed || !['running', 'paused'].includes(state.status);
  pause.innerHTML = icon(state.status === 'paused' ? 'play' : 'pause');
  pause.setAttribute('aria-label', state.status === 'paused' ? 'Resume game' : 'Pause game');
  restart.hidden = !['running', 'paused'].includes(state.status);
  $('#game-state').innerHTML = `<span class="status-dot"></span>${copy[3]}`;
  if (renderedStatus !== state.status) {
    document.body.dataset.state = state.status;
    renderedStatus = state.status;
  }
}

primary.addEventListener('click', activate);
pause.addEventListener('click', activate);
restart.addEventListener('click', () => {
  if (failed) return;
  audio.unlock(); audio.play('ui');
  dispatch({ type: 'restart', speed: selectedSpeed });
  dispatch({ type: 'start' });
  surface.focus({ preventScroll: true });
});
sound.addEventListener('click', () => {
  audio.unlock();
  preferences.muted = !preferences.muted;
  audio.setMuted(preferences.muted);
  savePreferences(preferences);
  syncUI();
});
document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach(button => {
  button.addEventListener('click', () => {
    selectedSpeed = button.dataset.speed as Speed;
    for (const sibling of document.querySelectorAll<HTMLButtonElement>('[data-speed]')) {
      const active = sibling === button;
      sibling.classList.toggle('selected', active);
      sibling.setAttribute('aria-pressed', String(active));
    }
    const descriptions = { relaxed: 'A slower stroll through the garden.', classic: 'A familiar rhythm. Room to grow.', fast: 'For snakes with somewhere to be.' };
    $('#speed-note').textContent = ['running', 'paused'].includes(state.status) ? 'Your new pace starts with the next game.' : descriptions[selectedSpeed];
    syncUI();
  });
});
document.querySelectorAll<HTMLButtonElement>('[data-direction]').forEach(button => {
  button.addEventListener('click', () => turn(button.dataset.direction as Direction));
});
$('#reload').addEventListener('click', () => location.reload());
document.addEventListener('visibilitychange', () => { if (document.hidden) dispatch({ type: 'pause' }); });
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  input.clear();
  graphicsFailure('The graphics connection was interrupted. Reload to plant a fresh garden.');
});
reduceMotion.addEventListener('change', event => renderer?.setReducedMotion(event.matches));
const observer = new ResizeObserver(entries => {
  const rect = entries[0].contentRect;
  renderer?.resize(rect.width, rect.height);
});
observer.observe(surface);
let frameId = 0;
function frame(now: number) {
  const alpha = manual ? manualAlpha : clock.advance(now, 1000 / SPEEDS[state.speed], state.status === 'running' && !failed, tick);
  const display = state.status === 'ready' ? previewState : state;
  renderer?.render(display, state.status === 'ready' ? previewState : previous, state.status === 'running' ? alpha : 1, now / 1000);
  frameId = requestAnimationFrame(frame);
}
syncUI();
frameId = requestAnimationFrame(frame);

if (import.meta.env.MODE === 'e2e') {
  import('./testing/harness').then(({ installHarness }) => installHarness({
    getState: () => state,
    setState: next => { state = next; previous = next; clock.reset(); input.clear(); manualAlpha = 1; syncUI(); },
    setRandom: source => { random = source; },
    setManual: value => { manual = value; clock.reset(); manualNow = 0; },
    tick,
    advance: milliseconds => {
      clock.advance(manualNow, 1000 / SPEEDS[state.speed], state.status === 'running', tick);
      manualNow += milliseconds;
      manualAlpha = clock.advance(manualNow, 1000 / SPEEDS[state.speed], state.status === 'running', tick);
    },
  }));
}

if (import.meta.hot) import.meta.hot.dispose(() => {
  cancelAnimationFrame(frameId);
  observer.disconnect(); input.dispose(); audio.dispose(); renderer?.dispose();
});
