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
    mask: null,
  };
}

export function getLayerContext(layer: Layer): CanvasRenderingContext2D {
  const ctx = layer.canvas.getContext('2d');
  if (!ctx) throw new Error(`Layer "${layer.name}" has no 2D context`);
  return ctx;
}

export function getCanvasContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas has no 2D context');
  return ctx;
}

export function cloneCanvasImageData(canvas: HTMLCanvasElement): ImageData {
  return getCanvasContext(canvas).getImageData(0, 0, canvas.width, canvas.height);
}

export function restoreCanvasImageData(canvas: HTMLCanvasElement, data: ImageData): void {
  getCanvasContext(canvas).putImageData(data, 0, 0);
}

export function cloneLayerImageData(layer: Layer): ImageData {
  return cloneCanvasImageData(layer.canvas);
}

export function restoreLayerImageData(layer: Layer, data: ImageData): void {
  restoreCanvasImageData(layer.canvas, data);
}

/** Creates a fully-opaque white mask canvas (everything visible). */
export function createMaskCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  return canvas;
}

/** Returns a deep pixel copy of a canvas. */
export function cloneCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/** Returns a deep copy of a layer, including its pixel data and mask. */
export function duplicateLayer(layer: Layer): Layer {
  layerCounter += 1;
  return {
    ...layer,
    id: crypto.randomUUID(),
    name: `${layer.name} copy`,
    canvas: cloneCanvas(layer.canvas),
    mask: layer.mask ? cloneCanvas(layer.mask) : null,
  };
}

export function getMaskContext(layer: Layer): CanvasRenderingContext2D {
  if (!layer.mask) throw new Error(`Layer "${layer.name}" has no mask`);
  const ctx = layer.mask.getContext('2d');
  if (!ctx) throw new Error(`Layer "${layer.name}" mask has no 2D context`);
  return ctx;
}

export function cloneMaskImageData(layer: Layer): ImageData {
  const ctx = getMaskContext(layer);
  return ctx.getImageData(0, 0, layer.mask!.width, layer.mask!.height);
}

export function restoreMaskImageData(layer: Layer, data: ImageData): void {
  const ctx = getMaskContext(layer);
  ctx.putImageData(data, 0, 0);
}

/** Composites a layer's pixels through its mask onto the given canvas. */
export function compositeLayerWithMask(layer: Layer, target: HTMLCanvasElement): void {
  target.width = layer.canvas.width;
  target.height = layer.canvas.height;
  const ctx = target.getContext('2d')!;
  ctx.clearRect(0, 0, target.width, target.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(layer.canvas, 0, 0);
  if (layer.mask) {
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(layer.mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  }
}
