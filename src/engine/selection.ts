import type { Point, SelectionState } from './types';

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

/** Returns the selection polygon as a Path2D in document coordinates. */
export function selectionPath(selection: SelectionState): Path2D {
  const path = new Path2D();
  const [first, ...rest] = selection.points;
  path.moveTo(first.x, first.y);
  for (const p of rest) path.lineTo(p.x, p.y);
  path.closePath();
  return path;
}

/** Clips the given context to the selection polygon, if any. */
export function clipToSelection(ctx: CanvasRenderingContext2D, selection: SelectionState | null) {
  if (!selection) return;
  ctx.clip(selectionPath(selection));
}

/** Returns a copy of the selection translated by (dx, dy). */
export function translateSelection(selection: SelectionState, dx: number, dy: number): SelectionState {
  return {
    ...selection,
    points: selection.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
    bounds: { ...selection.bounds, x: selection.bounds.x + dx, y: selection.bounds.y + dy },
  };
}
