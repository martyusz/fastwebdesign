import type { Point, SelectionState } from './types';

/** Euclidean distance across (r, g, b, a), 0-255 each. */
const MAX_COLOR_DISTANCE = Math.sqrt(255 * 255 * 4);

function boundsOf(points: Point[]): SelectionState['bounds'] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** Builds a rectangular selection from two opposite corners. */
export function rectSelection(a: Point, b: Point): SelectionState | null {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const width = Math.abs(b.x - a.x);
  const height = Math.abs(b.y - a.y);
  if (width < 1 || height < 1) return null;
  const points: Point[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
  return { kind: 'rect', points, bounds: { x, y, width, height } };
}

/** Builds a freehand (lasso) selection from a list of traced points. */
export function lassoSelection(points: Point[]): SelectionState | null {
  if (points.length < 3) return null;
  const bounds = boundsOf(points);
  if (bounds.width < 1 || bounds.height < 1) return null;
  return { kind: 'lasso', points, bounds };
}

/** Returns the selection outline as a Path2D in document coordinates. */
export function selectionPath(selection: SelectionState): Path2D {
  const path = new Path2D();
  if (selection.kind === 'mask') {
    for (const loop of selection.contours ?? []) {
      if (loop.length < 2) continue;
      const [first, ...rest] = loop;
      path.moveTo(first.x, first.y);
      for (const p of rest) path.lineTo(p.x, p.y);
      path.closePath();
    }
    return path;
  }
  const [first, ...rest] = selection.points;
  if (!first) return path;
  path.moveTo(first.x, first.y);
  for (const p of rest) path.lineTo(p.x, p.y);
  path.closePath();
  return path;
}

/** Clips the given context to the selection outline, if any. */
export function clipToSelection(ctx: CanvasRenderingContext2D, selection: SelectionState | null) {
  if (!selection) return;
  ctx.clip(selectionPath(selection), 'evenodd');
}

/** Returns a copy of the selection translated by (dx, dy). */
export function translateSelection(selection: SelectionState, dx: number, dy: number): SelectionState {
  if (selection.kind === 'mask' && selection.mask) {
    const { width, height } = selection.mask;
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    mask.getContext('2d')!.drawImage(selection.mask, dx, dy);
    return {
      ...selection,
      mask,
      contours: (selection.contours ?? []).map((loop) => loop.map((p) => ({ x: p.x + dx, y: p.y + dy }))),
      bounds: { ...selection.bounds, x: selection.bounds.x + dx, y: selection.bounds.y + dy },
    };
  }
  return {
    ...selection,
    points: selection.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    bounds: { ...selection.bounds, x: selection.bounds.x + dx, y: selection.bounds.y + dy },
  };
}

/** Creates a fully transparent (nothing selected) mask canvas. */
export function createEmptyMask(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/** Creates a fully opaque white (everything selected) mask canvas. */
export function createFullMask(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/** Rasterizes any selection (or no selection = everything) into a full-document mask canvas. */
export function selectionToMask(selection: SelectionState | null, width: number, height: number): HTMLCanvasElement {
  if (!selection) return createFullMask(width, height);
  if (selection.kind === 'mask' && selection.mask) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d')!.drawImage(selection.mask, 0, 0);
    return canvas;
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fill(selectionPath(selection), 'evenodd');
  return canvas;
}

/** Returns the bounding box of the non-zero-alpha area of a mask, or null if empty. */
export function maskBounds(mask: HTMLCanvasElement): SelectionState['bounds'] | null {
  const { width, height } = mask;
  const data = mask.getContext('2d')!.getImageData(0, 0, width, height).data;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

/** Traces the outline(s) of a mask's selected area into closed pixel-grid loops, for marching ants. */
export function traceMaskContours(mask: HTMLCanvasElement, threshold = 128): Point[][] {
  const { width, height } = mask;
  const data = mask.getContext('2d')!.getImageData(0, 0, width, height).data;
  const selected = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3] >= threshold;

  const key = (p: Point) => `${p.x},${p.y}`;
  const edgesFrom = new Map<string, Point>();

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!selected(x, y)) continue;
      if (!selected(x, y - 1)) edgesFrom.set(key({ x, y }), { x: x + 1, y });
      if (!selected(x + 1, y)) edgesFrom.set(key({ x: x + 1, y }), { x: x + 1, y: y + 1 });
      if (!selected(x, y + 1)) edgesFrom.set(key({ x: x + 1, y: y + 1 }), { x, y: y + 1 });
      if (!selected(x - 1, y)) edgesFrom.set(key({ x, y: y + 1 }), { x, y });
    }
  }

  const visited = new Set<string>();
  const loops: Point[][] = [];

  for (const startKey of edgesFrom.keys()) {
    if (visited.has(startKey)) continue;
    const loop: Point[] = [];
    let curKey = startKey;
    while (!visited.has(curKey)) {
      visited.add(curKey);
      const [xs, ys] = curKey.split(',').map(Number);
      loop.push({ x: xs, y: ys });
      const next = edgesFrom.get(curKey);
      if (!next) break;
      curKey = key(next);
    }
    if (loop.length >= 3) loops.push(simplifyLoop(loop));
  }
  return loops;
}

/** Removes redundant collinear points from a closed axis-aligned loop. */
function simplifyLoop(loop: Point[]): Point[] {
  const n = loop.length;
  const result: Point[] = [];
  for (let i = 0; i < n; i++) {
    const prev = loop[(i - 1 + n) % n];
    const cur = loop[i];
    const next = loop[(i + 1) % n];
    const dx1 = cur.x - prev.x;
    const dy1 = cur.y - prev.y;
    const dx2 = next.x - cur.x;
    const dy2 = next.y - cur.y;
    if (dx1 * dy2 - dy1 * dx2 !== 0) result.push(cur);
  }
  return result.length >= 3 ? result : loop;
}

/** Builds a SelectionState from a mask, or null if nothing is selected. */
export function maskToSelection(mask: HTMLCanvasElement): SelectionState | null {
  const bounds = maskBounds(mask);
  if (!bounds) return null;
  const contours = traceMaskContours(mask);
  if (contours.length === 0) return null;
  return { kind: 'mask', points: [], bounds, mask, contours };
}

/** Flood-fills from (x, y) by color similarity and returns a selection mask. */
export function magicWandMask(source: HTMLCanvasElement, x: number, y: number, tolerancePercent: number): HTMLCanvasElement | null {
  const { width, height } = source;
  const px = Math.floor(x);
  const py = Math.floor(y);
  if (px < 0 || py < 0 || px >= width || py >= height) return null;

  const data = source.getContext('2d')!.getImageData(0, 0, width, height).data;
  const i0 = (py * width + px) * 4;
  const r0 = data[i0];
  const g0 = data[i0 + 1];
  const b0 = data[i0 + 2];
  const a0 = data[i0 + 3];
  const tolerance = (tolerancePercent / 100) * MAX_COLOR_DISTANCE;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [py * width + px];

  function matches(idx: number): boolean {
    const i = idx * 4;
    const dr = data[i] - r0;
    const dg = data[i + 1] - g0;
    const db = data[i + 2] - b0;
    const da = data[i + 3] - a0;
    return Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= tolerance;
  }

  while (stack.length) {
    const idx = stack.pop()!;
    if (visited[idx]) continue;
    if (!matches(idx)) continue;
    visited[idx] = 1;

    const xx = idx % width;
    const yy = (idx - xx) / width;
    if (xx > 0) stack.push(idx - 1);
    if (xx < width - 1) stack.push(idx + 1);
    if (yy > 0) stack.push(idx - width);
    if (yy < height - 1) stack.push(idx + width);
  }

  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const mctx = mask.getContext('2d')!;
  const out = mctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    if (visited[i]) {
      const o = i * 4;
      out.data[o] = 255;
      out.data[o + 1] = 255;
      out.data[o + 2] = 255;
      out.data[o + 3] = 255;
    }
  }
  mctx.putImageData(out, 0, 0);
  return mask;
}

/** Selects every pixel across the canvas within `tolerancePercent` of `color` (rgba 0-255). */
export function colorRangeMask(source: HTMLCanvasElement, color: [number, number, number, number], tolerancePercent: number): HTMLCanvasElement {
  const { width, height } = source;
  const data = source.getContext('2d')!.getImageData(0, 0, width, height).data;
  const tolerance = (tolerancePercent / 100) * MAX_COLOR_DISTANCE;
  const [r0, g0, b0, a0] = color;

  const mask = document.createElement('canvas');
  mask.width = width;
  mask.height = height;
  const mctx = mask.getContext('2d')!;
  const out = mctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const dr = data[o] - r0;
    const dg = data[o + 1] - g0;
    const db = data[o + 2] - b0;
    const da = data[o + 3] - a0;
    if (Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= tolerance) {
      out.data[o] = 255;
      out.data[o + 1] = 255;
      out.data[o + 2] = 255;
      out.data[o + 3] = 255;
    }
  }
  mctx.putImageData(out, 0, 0);
  return mask;
}

/** Inverts a mask's selection (selected <-> unselected). */
export function invertMask(mask: HTMLCanvasElement): HTMLCanvasElement {
  const { width, height } = mask;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  const src = mask.getContext('2d')!.getImageData(0, 0, width, height);
  const result = ctx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    result.data[o] = 255;
    result.data[o + 1] = 255;
    result.data[o + 2] = 255;
    result.data[o + 3] = 255 - src.data[o + 3];
  }
  ctx.putImageData(result, 0, 0);
  return out;
}

/** Softens a mask's edges by blurring its alpha channel by `radius` px. */
export function featherMask(mask: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const { width, height } = mask;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  if (radius > 0) ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(mask, 0, 0);
  ctx.filter = 'none';
  return out;
}

/** O(n) sliding-window maximum/minimum (window size 2*radius + 1, clamped at the edges). */
function slidingExtremum(values: Float64Array, radius: number, mode: 'max' | 'min'): Float64Array {
  const n = values.length;
  const out = new Float64Array(n);
  const deque: number[] = [];
  const better = mode === 'max'
    ? (a: number, b: number) => a >= b
    : (a: number, b: number) => a <= b;

  for (let i = 0; i < n + radius; i++) {
    if (i < n) {
      while (deque.length && better(values[i], values[deque[deque.length - 1]])) deque.pop();
      deque.push(i);
    }
    const center = i - radius;
    if (center >= 0 && center < n) {
      while (deque[0] < center - radius) deque.shift();
      out[center] = values[deque[0]];
    }
  }
  return out;
}

/** Applies a separable square max/min filter (dilation/erosion) to a mask's alpha channel. */
function morphMask(mask: HTMLCanvasElement, radius: number, mode: 'max' | 'min'): HTMLCanvasElement {
  const { width, height } = mask;
  const out = document.createElement('canvas');
  out.width = width;
  out.height = height;
  const outCtx = out.getContext('2d')!;
  if (radius <= 0) {
    outCtx.drawImage(mask, 0, 0);
    return out;
  }

  const src = mask.getContext('2d')!.getImageData(0, 0, width, height);
  const alpha = new Float64Array(width * height);
  for (let i = 0; i < width * height; i++) alpha[i] = src.data[i * 4 + 3];

  const horizontal = new Float64Array(width * height);
  for (let y = 0; y < height; y++) {
    const row = alpha.subarray(y * width, (y + 1) * width);
    horizontal.set(slidingExtremum(row, radius, mode), y * width);
  }

  const result = new Float64Array(width * height);
  const column = new Float64Array(height);
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) column[y] = horizontal[y * width + x];
    const filtered = slidingExtremum(column, radius, mode);
    for (let y = 0; y < height; y++) result[y * width + x] = filtered[y];
  }

  const outData = outCtx.createImageData(width, height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    outData.data[o] = 255;
    outData.data[o + 1] = 255;
    outData.data[o + 2] = 255;
    outData.data[o + 3] = result[i];
  }
  outCtx.putImageData(outData, 0, 0);
  return out;
}

/** Grows the selection outward by `px` pixels. */
export function expandMask(mask: HTMLCanvasElement, px: number): HTMLCanvasElement {
  return morphMask(mask, px, 'max');
}

/** Shrinks the selection inward by `px` pixels. */
export function contractMask(mask: HTMLCanvasElement, px: number): HTMLCanvasElement {
  return morphMask(mask, px, 'min');
}

/** Rounds off jagged edges: opens then closes the selection by `px` pixels. */
export function smoothMask(mask: HTMLCanvasElement, px: number): HTMLCanvasElement {
  if (px <= 0) {
    const out = document.createElement('canvas');
    out.width = mask.width;
    out.height = mask.height;
    out.getContext('2d')!.drawImage(mask, 0, 0);
    return out;
  }
  const opened = expandMask(contractMask(mask, px), px);
  return contractMask(expandMask(opened, px), px);
}
