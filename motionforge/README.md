# MotionForge

A browser-based, timeline-driven motion graphics editor built with React, TypeScript, Canvas 2D, and Zustand. Everything runs client-side.

## Stack

- React 18 + Vite + TypeScript
- HTML5 Canvas 2D + requestAnimationFrame render loop
- Zustand for state (composition, layers, keyframes, playhead)
- Tailwind CSS for the UI
- MediaRecorder API for WebM export (Phase 5)

## Architecture

- `src/engine` — composition model, render loop, interpolation
- `src/animation` — keyframe model + easing functions
- `src/layers` — layer types (solid, shape, text, image)
- `src/ui` — viewport, timeline, panels
- `src/store` — Zustand stores

## Development

```bash
npm install
npm run dev
```

Runs on http://localhost:5174.

## Status

**Phase 1** — App shell, comp viewport with checkerboard background, render loop, transport controls (play/pause/stop/loop, scrubber), and a single static solid layer with editable transform.
