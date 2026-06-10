import { clipToSelection } from '../engine/selection';
import { useEditorStore } from '../store/editorStore';
import type { DrawingTool, Point } from './types';

/** Shared drag-to-draw implementation for the rectangle and ellipse tools. */
function createBoxShapeTool(kind: 'rect' | 'ellipse'): DrawingTool {
  let start: Point | null = null;

  return {
    onPointerDown(ctx) {
      start = ctx.point;
      useEditorStore.getState().setToolPreview({ kind, x: start.x, y: start.y, width: 0, height: 0 });
    },
    onPointerMove(ctx) {
      if (!start) return;
      const x = Math.min(start.x, ctx.point.x);
      const y = Math.min(start.y, ctx.point.y);
      const width = Math.abs(ctx.point.x - start.x);
      const height = Math.abs(ctx.point.y - start.y);
      useEditorStore.getState().setToolPreview({ kind, x, y, width, height });
    },
    onPointerUp(ctx) {
      if (start) {
        const x = Math.min(start.x, ctx.point.x);
        const y = Math.min(start.y, ctx.point.y);
        const width = Math.abs(ctx.point.x - start.x);
        const height = Math.abs(ctx.point.y - start.y);

        if (width >= 1 && height >= 1) {
          const layerCtx = ctx.target.getContext('2d')!;
          layerCtx.save();
          clipToSelection(layerCtx, ctx.selection);
          layerCtx.fillStyle = ctx.brushColor;
          if (kind === 'rect') {
            layerCtx.fillRect(x, y, width, height);
          } else {
            layerCtx.beginPath();
            layerCtx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
            layerCtx.fill();
          }
          layerCtx.restore();
        }
      }
      start = null;
      useEditorStore.getState().setToolPreview(null);
    },
  };
}

export const rectangleTool = createBoxShapeTool('rect');
export const ellipseTool = createBoxShapeTool('ellipse');

/** Drag to draw a straight stroked line. */
export const lineTool: DrawingTool = (() => {
  let start: Point | null = null;

  return {
    onPointerDown(ctx) {
      start = ctx.point;
      useEditorStore.getState().setToolPreview({ kind: 'line', x1: start.x, y1: start.y, x2: start.x, y2: start.y });
    },
    onPointerMove(ctx) {
      if (!start) return;
      useEditorStore.getState().setToolPreview({ kind: 'line', x1: start.x, y1: start.y, x2: ctx.point.x, y2: ctx.point.y });
    },
    onPointerUp(ctx) {
      if (start && (start.x !== ctx.point.x || start.y !== ctx.point.y)) {
        const layerCtx = ctx.target.getContext('2d')!;
        layerCtx.save();
        clipToSelection(layerCtx, ctx.selection);
        layerCtx.strokeStyle = ctx.brushColor;
        layerCtx.lineWidth = ctx.brushSize;
        layerCtx.lineCap = 'round';
        layerCtx.beginPath();
        layerCtx.moveTo(start.x, start.y);
        layerCtx.lineTo(ctx.point.x, ctx.point.y);
        layerCtx.stroke();
        layerCtx.restore();
      }
      start = null;
      useEditorStore.getState().setToolPreview(null);
    },
  };
})();
