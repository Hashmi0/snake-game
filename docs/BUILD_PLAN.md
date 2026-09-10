# Snake Garden — Corrected Build and Handoff Plan

## Outcome and execution

Build a complete single-player browser Snake game with classic Nokia rules, polished 3D visuals, mobile swipes, keyboard controls, animation, and sound. Ship a static application suitable for GitHub Pages and Vercel. No backend, accounts, multiplayer, online leaderboard, or installation requirement.

The first execution consumes this plan and creates AGENTS.md, this file, and docs/PROGRESS.md before implementation. Those instructions are portable across agents and do not depend on the original conversation. Resume by reading all three, reconciling Git and files, and continuing the first unfinished task.

Record for each task: stable ID; pending/in progress/verified/blocked status; intended change and files; exact check commands/results/evidence; last verified implementation commit; known failures; exact next action. Mark in progress before editing, update after verification, and save local milestone commits. Preserve partial and unrelated work. Continue independently through all phases. Unavailable checks remain explicitly unverified. Account limits can interrupt unexpectedly; saved checkpoints enable recovery, not automatic account-limit continuation.

## Game specification

- 20×20 grid, three-cell snake near center facing right. One food item uniformly selected from free cells. Eating adds one segment and 10 points.
- Walls and self-collision end a run. Entering the departing tail is legal when it moves away on that tick. Filling the board wins.
- Relaxed/classic/fast: 5/8/12 moves per second. Classic default. Selected speed applies to the next run.
- Ready, running, paused, game-over, won states. Start, pause/resume, restart, victory actions. Best scores per speed and mute preference persist locally; unavailable/corrupt storage never blocks gameplay.

## Presentation and interaction

Snake Garden: sculpted garden board, rounded green snake with expressive eyes, colorful fruit, warm lighting, cream/dark-green interface. Fixed elevated orthographic camera aligned to screen directions; entire board visible portrait and landscape. Score, best, pause, sound controls outside the board. Connected-looking interpolated movement, fruit bounce, eating particles, short collision animation; effects preserve food/collision visibility. Reduced motion removes decoration but preserves essential movement. Geometry and sounds procedural; optional external generated assets cannot block delivery.

Arrow keys/WASD steer; Space pauses/resumes; Enter starts/restarts in appropriate states. Ignore repeat keydowns and avoid duplicate handling with focused controls. Swipes fire immediately at 20 CSS pixels, dominant axis, ties wait; one command per gesture. Track primary pointer, handle cancellation/lost capture, ignore additional fingers. Specify touch-action on the play surface while preserving normal page behavior elsewhere. Touch direction controls at least 44×44 CSS pixels. Buffer two legal turns, validate against last accepted direction, consume one per tick, ignore duplicates/reversals. Pause/restart clear directions and gestures. Hidden page pauses; return requires explicit resume.

## Architecture

TypeScript + Vite + Three.js + native HTML/CSS + Web Audio + Vitest + Playwright + npm. Choose compatible stable versions, pin Node, commit lockfile.

- Simulation: ordered snake cells, direction queue, food, score, speed, status; command processing and one-tick advancement with injected randomness; no DOM/time dependencies.
- Runtime: fixed timestep, maximum two catch-up ticks per frame, discard excess time, reset accumulation on pause/resume; supply previous/current snapshots and interpolation fraction.
- Input: keyboard/swipe/touch buttons emit shared directions/session commands.
- Renderer: owns scene/effects and consumes snapshots/events without modifying rules. Interpolate along grid movement without cutting corners.
- Audio: consumes gameplay/UI events and mute settings; unlock on gesture, fail harmlessly.
- Shell: menus, accessible controls, storage, resizing, lifecycle.

Pixel density capped at 2, reusable geometry/materials, bounded particles, no expensive post-processing. Missing graphics gets readable error; context loss pauses with reload action.

## Tasks and gates

| ID | Task | Acceptance |
|---|---|---|
| 0.1 | Inspect workspace, create handoff docs, initialize Git only if absent | Documents exist and recovery instructions consistent |
| 0.2 | Scaffold responsive shell, pinned tooling, verification scripts | Local page opens; typecheck/build pass |
| 1.1 | Movement, food, growth, scoring, collision, victory | Deterministic rule tests pass |
| 1.2 | Commands, buffering, speeds, reset, session states | Transition/queue/clock tests pass |
| 2.1 | 3D board, snake, food, fixed-step runtime | Visible playable 3D game |
| 2.2 | Keyboard, swipes, touch buttons, session controls | Full runs/restarts with keyboard/touch; portrait/landscape work |
| 3.1 | Storage, sound preferences, lifecycle, resize, graphics failures | Failures do not break game, state survives resize |
| 3.2 | Test-only deterministic fixtures and browser scenarios | Gameplay/interruption/gesture/restart tests pass |
| 4.1 | Final styling, interpolation, effects, sound | Finished visual/audio behavior |
| 4.2 | Responsive layout, focus, contrast, reduced motion, performance | Saved visual evidence and measured performance |
| 5.1 | Root and repository-subpath production verification | Assets and real gameplay pass smoke tests |
| 5.2 | Manual Pages workflow, Vercel settings, README, final journal | Clean install/checks, deploy instructions, limitations recorded |

For every task: mark in progress; implement; run relevant tests/checks; inspect result; fix failures; record evidence and commit verified milestones. Continue to the next task without another prompt. Independent implementation may run in parallel against agreed interfaces; integration gates remain ordered.

## Verification

Scripts: dev, typecheck, test:unit, test:e2e, build, preview, test:smoke.

Inject randomness/time into a dedicated E2E build. Seed scenarios and control time there. Production excludes test controls and is smoke-tested separately. Cover growth/scoring/free food/collisions/departing tail/victory; rapid turns/reversals/queue limits; speeds/bounded catch-up/pause timing; restart/background lifecycle; speed-specific scores and corrupt/inaccessible storage.

Browser tests: deterministic start→eat→collide→restart; keyboard/swipes (before release, cancellation, extra fingers); direction buttons; scroll boundaries; sound/storage; background/rotation/repeated restarts without duplicate loops/listeners. Run Chromium desktop, Chromium mobile and WebKit mobile emulation. Real production smoke tests exercise load/assets/start/steer/restart and assert no test controls.

Capture and inspect 320×568, 390×844, 844×390, 1440×900; ready/running/paused/game-over states. Verify board fit, non-overlapping controls, readable text, visible focus, clear turns/effects. Save evidence. Performance: after 5-second warmup measure 60 seconds with snake lengths 3,100,350; record median/p95 frame intervals, browser, viewport and hardware. Target 60 FPS; investigate sustained below 30 FPS on available hardware. Emulation and physical testing are separate; unavailable physical-phone checks are a limitation, not a pass.

## Hosting and handoff

Configurable base defaults to /. Smoke-test /snake-game/; eventual Pages base follows actual repository name. Prepare manually triggered Pages workflow that builds/publishes dist, Vercel build/output settings, exact setup/build/preview/deploy instructions. Publication awaits an identified destination and is not required to finish the deployable artifact.

Final report: how to launch, implemented features, check results, mobile/desktop screenshots, deployment steps, limitations, plan/progress locations.

Resume prompt: Read AGENTS.md, docs/BUILD_PLAN.md and docs/PROGRESS.md. Reconcile with current files/Git state, preserve partial work, and continue remaining phases. Verify milestones and keep progress current.
