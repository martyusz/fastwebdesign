import type { Layer, Point, SelectionState } from '../engine/types';

export type { Point };

export interface ToolContext {
  layer: Layer;
  /** The pixel buffer being painted onto (the layer's canvas, or its mask). */
  target: HTMLCanvasElement;
  point: Point;
  brushSize: number;
  brushHardness: number;
  brushColor: string;
  /** Secondary color, used as the gradient end color. */
  secondaryColor: string;
  /** Active selection (if any) that paint operations should be clipped to. */
  selection: SelectionState | null;
}

/** A tool that paints directly onto the active layer's pixel buffer. */
export interface DrawingTool {
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
}
