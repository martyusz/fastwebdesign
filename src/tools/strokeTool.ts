import { clipToSelection } from '../engine/selection';
import type { DrawingTool, Point, ToolContext } from './types';

/**
 * Shared implementation for freehand brush-style tools (brush, eraser, pencil).
 * Draws a continuous stroke onto the active layer using the given composite
 * operation, approximating brush hardness with a canvas blur filter.
 */
export function createStrokeTool(
  compositeOperation: GlobalCompositeOperation,
  options: { hardnessAffectsBlur?: boolean } = {},
): DrawingTool {
  const { hardnessAffectsBlur = true } = options;
  let lastPoint: Point | null = null;

  function strokeSegment(ctx: ToolContext, from: Point, to: Point) {
    const layerCtx = ctx.target.getContext('2d')!;

    layerCtx.save();
    clipToSelection(layerCtx, ctx.selection);
    layerCtx.globalCompositeOperation = compositeOperation;
    layerCtx.lineCap = 'round';
    layerCtx.lineJoin = 'round';
    layerCtx.lineWidth = ctx.brushSize;
    layerCtx.strokeStyle = ctx.brushColor;
    layerCtx.fillStyle = ctx.brushColor;

    if (hardnessAffectsBlur) {
      const softness = Math.max(0, 1 - ctx.brushHardness / 100);
      const blurPx = softness * ctx.brushSize * 0.35;
      layerCtx.filter = blurPx > 0.05 ? `blur(${blurPx}px)` : 'none';
    }

    layerCtx.beginPath();
    layerCtx.moveTo(from.x, from.y);
    layerCtx.lineTo(to.x, to.y);
    layerCtx.stroke();

    // Draw a dot for single clicks / very short strokes.
    if (from.x === to.x && from.y === to.y) {
      layerCtx.beginPath();
      layerCtx.arc(to.x, to.y, ctx.brushSize / 2, 0, Math.PI * 2);
      layerCtx.fill();
    }

    layerCtx.restore();
  }

  return {
    onPointerDown(ctx) {
      lastPoint = ctx.point;
      strokeSegment(ctx, ctx.point, ctx.point);
    },
    onPointerMove(ctx) {
      if (!lastPoint) return;
      strokeSegment(ctx, lastPoint, ctx.point);
      lastPoint = ctx.point;
    },
    onPointerUp() {
      lastPoint = null;
    },
  };
}
