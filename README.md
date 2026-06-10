# PixelForge

A professional, browser-based raster image editor built with React, TypeScript, Konva, and Zustand. Everything runs client-side — no backend required.

## Stack

- React 18 + Vite + TypeScript
- Konva.js / react-konva for the canvas and layer engine
- Zustand for state management
- Tailwind CSS for the UI

## Architecture

- `src/engine` — canvas + layer model, undo/redo (command pattern)
- `src/tools` — pluggable tool modules (brush, eraser, ...)
- `src/filters` — pure image filter functions
- `src/ui` — panels, toolbar, menus
- `src/store` — Zustand stores

## Development

```bash
npm install
npm run dev
```

## Status

**Phase 1** — App shell, canvas, single-layer drawing with brush/eraser, and full undo/redo history.
