import type { Layer } from './types';

let layerCounter = 0;

export function createLayer(width: number, height: number, name?: string): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  layerCounter += 1;

  return {
    id: crypto.randomUUID(),
    name: name ?? `Layer ${layerCounter}`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    canvas,
  };
}

export function getLayerContext(layer: Layer): CanvasRenderingContext2D {
  const ctx = layer.canvas.getContext('2d');
  if (!ctx) throw new Error(`Layer "${layer.name}" has no 2D context`);
  return ctx;
}

export function cloneLayerImageData(layer: Layer): ImageData {
  const ctx = getLayerContext(layer);
  return ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
}

export function restoreLayerImageData(layer: Layer, data: ImageData): void {
  const ctx = getLayerContext(layer);
  ctx.putImageData(data, 0, 0);
}
