import type { Composition, Layer } from './types';

/** Draws the composition (background + layers) at the current frame. */
export function renderComposition(
  ctx: CanvasRenderingContext2D,
  comp: Composition,
  layers: Layer[],
): void {
  ctx.clearRect(0, 0, comp.width, comp.height);

  // Layers are stored bottom-to-top in the array but the layer list shows
  // top-to-last; render in array order (index 0 = bottom).
  for (const layer of layers) {
    if (!layer.visible) continue;
    drawLayer(ctx, comp, layer);
  }
}

function drawLayer(ctx: CanvasRenderingContext2D, comp: Composition, layer: Layer): void {
  const { x, y, scale, rotation, opacity } = layer.transform;

  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(100, opacity)) / 100;
  ctx.translate(comp.width / 2 + x, comp.height / 2 + y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale / 100, scale / 100);

  switch (layer.type) {
    case 'solid':
      ctx.fillStyle = layer.color;
      ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
      break;
  }

  ctx.restore();
}
