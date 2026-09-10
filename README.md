# Snake Garden

Snake Garden is a small, tactile 3D Snake game inspired by the Nokia classic. It runs as a static Vite site and supports keyboard steering, immediate swipe gestures, touch direction buttons, local best scores, pause/resume, reduced motion, and procedural sound.

## Run locally

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. Use arrow keys or WASD, Space to pause, and Enter to start or restart. On touch devices, swipe on the board or use the four direction buttons.

## Verify

```bash
npm run typecheck
npm run test:unit
npm run build
npm run test:e2e
npm run preview
npm run test:smoke
```

The deterministic browser harness is only included in the `e2e` mode build (`npm run build:test`); production builds expose no scenario controls. WebKit and physical-phone checks require those runtimes/devices and are recorded separately when unavailable.

## Deploy

Vercel: import the repository, use `npm run build` as the build command, and `dist` as the output directory. `vercel.json` records these settings.

GitHub Pages: enable Pages with GitHub Actions, then run the manually triggered **Deploy Snake Garden to GitHub Pages** workflow. The workflow derives the repository subpath and builds with the correct `VITE_BASE_PATH`. For a custom domain, set `VITE_BASE_PATH=/`.

The repository-subpath smoke case is `/snake-game/`; the real path is the eventual repository name.
