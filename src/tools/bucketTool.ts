import { selectionPath } from '../engine/selection';
import type { DrawingTool } from './types';

const TOLERANCE = 32;

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = parseInt(clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Flood-fills the connected region under the click point with the brush color. */
export const bucketTool: DrawingTool = {
  onPointerDown(ctx) {
    const { target, point, selection } = ctx;
    const width = target.width;
    const height = target.height;
    const x0 = Math.floor(point.x);
    const y0 = Math.floor(point.y);
    if (x0 < 0 || y0 < 0 || x0 >= width || y0 >= height) return;

    const targetCtx = target.getContext('2d')!;
    const imageData = targetCtx.getImageData(0, 0, width, height);
    const data = imageData.data;

    let selectionMask: Uint8Array | null = null;
    if (selection) {
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = width;
      maskCanvas.height = height;
      const maskCtx = maskCanvas.getContext('2d')!;
      maskCtx.fillStyle = '#fff';
      maskCtx.fill(selectionPath(selection));
      const maskData = maskCtx.getImageData(0, 0, width, height).data;
      selectionMask = new Uint8Array(width * height);
      for (let i = 0; i < width * height; i++) selectionMask[i] = maskData[i * 4 + 3] > 0 ? 1 : 0;
      if (selectionMask[y0 * width + x0] === 0) return;
    }

    const startIdx = (y0 * width + x0) * 4;
    const startR = data[startIdx];
    const startG = data[startIdx + 1];
    const startB = data[startIdx + 2];
    const startA = data[startIdx + 3];

    const [fillR, fillG, fillB] = hexToRgb(ctx.brushColor);
    const fillA = 255;

    if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;

    const visited = new Uint8Array(width * height);
    const stack: number[] = [y0 * width + x0];

    function matches(idx: number): boolean {
      const i = idx * 4;
      const dr = data[i] - startR;
      const dg = data[i + 1] - startG;
      const db = data[i + 2] - startB;
      const da = data[i + 3] - startA;
      return Math.sqrt(dr * dr + dg * dg + db * db + da * da) <= TOLERANCE;
    }

    while (stack.length) {
      const idx = stack.pop()!;
      if (visited[idx]) continue;
      if (selectionMask && !selectionMask[idx]) continue;
      if (!matches(idx)) continue;
      visited[idx] = 1;

      const i = idx * 4;
      data[i] = fillR;
      data[i + 1] = fillG;
      data[i + 2] = fillB;
      data[i + 3] = fillA;

      const x = idx % width;
      const y = (idx - x) / width;
      if (x > 0) stack.push(idx - 1);
      if (x < width - 1) stack.push(idx + 1);
      if (y > 0) stack.push(idx - width);
      if (y < height - 1) stack.push(idx + width);
    }

    targetCtx.putImageData(imageData, 0, 0);
  },
  onPointerMove() {},
  onPointerUp() {},
};
