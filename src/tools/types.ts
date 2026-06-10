import type { Layer } from '../engine/types';

export interface Point {
  x: number;
  y: number;
}

export interface ToolContext {
  layer: Layer;
  point: Point;
  brushSize: number;
  brushHardness: number;
  brushColor: string;
}

/** A tool that paints directly onto the active layer's pixel buffer. */
export interface DrawingTool {
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
}
