import { clipToSelection, translateSelection } from '../engine/selection';
import { useEditorStore } from '../store/editorStore';
import type { DrawingTool, Point } from './types';

let dragStart: Point | null = null;
let pieceCanvas: HTMLCanvasElement | null = null;
let baseCanvas: HTMLCanvasElement | null = null;

/**
 * Drags the current selection's pixels (or the whole layer, if nothing is
 * selected) to a new position.
 */
export const moveTool: DrawingTool = {
  onPointerDown(ctx) {
    dragStart = ctx.point;

    const { target, selection } = ctx;
    const width = target.width;
    const height = target.height;

    pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = width;
    pieceCanvas.height = height;
    const pieceCtx = pieceCanvas.getContext('2d')!;

    baseCanvas = document.createElement('canvas');
    baseCanvas.width = width;
    baseCanvas.height = height;
    const baseCtx = baseCanvas.getContext('2d')!;
    baseCtx.drawImage(target, 0, 0);

    if (selection) {
      pieceCtx.save();
      clipToSelection(pieceCtx, selection);
      pieceCtx.drawImage(target, 0, 0);
      pieceCtx.restore();

      baseCtx.save();
      clipToSelection(baseCtx, selection);
      baseCtx.clearRect(0, 0, width, height);
      baseCtx.restore();
    } else {
      pieceCtx.drawImage(target, 0, 0);
      baseCtx.clearRect(0, 0, width, height);
    }
  },
  onPointerMove(ctx) {
    if (!dragStart || !pieceCanvas || !baseCanvas) return;
    const dx = ctx.point.x - dragStart.x;
    const dy = ctx.point.y - dragStart.y;
    const targetCtx = ctx.target.getContext('2d')!;
    targetCtx.clearRect(0, 0, ctx.target.width, ctx.target.height);
    targetCtx.drawImage(baseCanvas, 0, 0);
    targetCtx.drawImage(pieceCanvas, dx, dy);
  },
  onPointerUp(ctx) {
    if (!dragStart) return;
    const dx = ctx.point.x - dragStart.x;
    const dy = ctx.point.y - dragStart.y;
    if (ctx.selection && (dx !== 0 || dy !== 0)) {
      useEditorStore.getState().setSelection(translateSelection(ctx.selection, dx, dy));
    }
    dragStart = null;
    pieceCanvas = null;
    baseCanvas = null;
  },
};
