import { BLEND_MODE_TO_COMPOSITE, type Layer } from './types';

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

/** Flattens all visible layers (respecting mask, opacity, blend mode) into one canvas. */
export function compositeAllLayers(layers: Layer[], width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  for (const layer of layers) {
    if (!layer.visible) continue;
    let source: HTMLCanvasElement = layer.canvas;
    if (layer.mask) {
      const masked = document.createElement('canvas');
      compositeLayerWithMask(layer, masked);
      source = masked;
    }
    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = BLEND_MODE_TO_COMPOSITE[layer.blendMode];
    ctx.drawImage(source, 0, 0);
    ctx.restore();
  }

  return canvas;
}

/** Returns a horizontally-flipped copy of a canvas (same dimensions). */
export function flipCanvasHorizontal(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/** Returns a vertically-flipped copy of a canvas (same dimensions). */
export function flipCanvasVertical(source: HTMLCanvasElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(0, canvas.height);
  ctx.scale(1, -1);
  ctx.drawImage(source, 0, 0);
  return canvas;
}

/** Returns a copy of a canvas resized to new dimensions, placing the original content at the given offset (no scaling). Transparent fill. */
export function resizeCanvas(source: HTMLCanvasElement, newWidth: number, newHeight: number, offsetX: number, offsetY: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.getContext('2d')!.drawImage(source, offsetX, offsetY);
  return canvas;
}

/** Like resizeCanvas, but fills new areas opaque white (used for layer masks, where opaque = visible). */
export function resizeMaskCanvas(source: HTMLCanvasElement, newWidth: number, newHeight: number, offsetX: number, offsetY: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, newWidth, newHeight);
  ctx.drawImage(source, offsetX, offsetY);
  return canvas;
}

/** Returns a copy of a canvas scaled to fill new dimensions. */
export function scaleCanvas(source: HTMLCanvasElement, newWidth: number, newHeight: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  canvas.getContext('2d')!.drawImage(source, 0, 0, newWidth, newHeight);
  return canvas;
}

/** Returns a copy of a canvas rotated 90deg, cropped back to the original dimensions. */
export function rotateCanvas90(source: HTMLCanvasElement, direction: 'cw' | 'ccw'): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((direction === 'cw' ? 1 : -1) * (Math.PI / 2));
  ctx.drawImage(source, -source.width / 2, -source.height / 2);
  return canvas;
}
