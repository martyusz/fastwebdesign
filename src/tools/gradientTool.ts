import { clipToSelection } from '../engine/selection';
import { useEditorStore } from '../store/editorStore';
import type { DrawingTool, Point } from './types';

let start: Point | null = null;

/** Drag to fill the layer (or selection) with a linear gradient between the two brush colors. */
export const gradientTool: DrawingTool = {
  onPointerDown(ctx) {
    start = ctx.point;
    useEditorStore.getState().setToolPreview({ kind: 'gradient', x1: start.x, y1: start.y, x2: start.x, y2: start.y });
  },
  onPointerMove(ctx) {
    if (!start) return;
    useEditorStore.getState().setToolPreview({ kind: 'gradient', x1: start.x, y1: start.y, x2: ctx.point.x, y2: ctx.point.y });
  },
  onPointerUp(ctx) {
    if (!start) return;
    const end = ctx.point;
    const layerCtx = ctx.target.getContext('2d')!;

    if (start.x !== end.x || start.y !== end.y) {
      layerCtx.save();
      clipToSelection(layerCtx, ctx.selection);
      const gradient = layerCtx.createLinearGradient(start.x, start.y, end.x, end.y);
      gradient.addColorStop(0, ctx.brushColor);
      gradient.addColorStop(1, ctx.secondaryColor);
      layerCtx.fillStyle = gradient;
      layerCtx.fillRect(0, 0, ctx.target.width, ctx.target.height);
      layerCtx.restore();
    }

    start = null;
    useEditorStore.getState().setToolPreview(null);
  },
};
