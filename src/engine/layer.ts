import { applyAdjustment, ADJUSTMENT_LABELS, defaultAdjustmentSettings } from './adjustments';
import { BLEND_MODE_TO_COMPOSITE, type AdjustmentType, type Layer } from './types';

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
    adjustment: null,
  };
}

/** Creates a non-destructive adjustment layer. Its canvas is unused (1x1 placeholder). */
export function createAdjustmentLayer(type: AdjustmentType): Layer {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return {
    id: crypto.randomUUID(),
    name: ADJUSTMENT_LABELS[type],
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: 'normal',
    canvas,
    mask: null,
    adjustment: { type, settings: defaultAdjustmentSettings(type), clipToBelow: false },
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
    adjustment: layer.adjustment
      ? { ...layer.adjustment, settings: structuredClone(layer.adjustment.settings) }
      : null,
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

/** Applies an adjustment layer's effect to `source`, blended by the adjustment layer's opacity. */
function applyAdjustmentBlend(source: HTMLCanvasElement, layer: Layer): HTMLCanvasElement {
  const adjusted = applyAdjustment(source, layer.adjustment!);
  if (layer.opacity >= 1) return adjusted;
  const result = document.createElement('canvas');
  result.width = source.width;
  result.height = source.height;
  const ctx = result.getContext('2d')!;
  ctx.drawImage(source, 0, 0);
  ctx.globalAlpha = Math.max(0, layer.opacity);
  ctx.drawImage(adjusted, 0, 0);
  return result;
}

/**
 * Flattens all visible layers (respecting mask, opacity, blend mode) into one canvas.
 * Adjustment layers are non-destructive: a clipped adjustment affects only the layer
 * directly below it, while an unclipped adjustment affects the full composite so far.
 */
export function compositeAllLayers(layers: Layer[], width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i];
    if (layer.adjustment) continue;
    if (!layer.visible) continue;

    let source: HTMLCanvasElement = layer.canvas;
    if (layer.mask) {
      const masked = document.createElement('canvas');
      compositeLayerWithMask(layer, masked);
      source = masked;
    }

    let j = i + 1;
    while (j < layers.length && layers[j].adjustment?.clipToBelow) {
      if (layers[j].visible) source = applyAdjustmentBlend(source, layers[j]);
      j++;
    }

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = BLEND_MODE_TO_COMPOSITE[layer.blendMode];
    ctx.drawImage(source, 0, 0);
    ctx.restore();

    while (j < layers.length && layers[j].adjustment && !layers[j].adjustment!.clipToBelow) {
      if (layers[j].visible) {
        const adjusted = applyAdjustmentBlend(canvas, layers[j]);
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(adjusted, 0, 0);
      }
      j++;
    }
  }

  return canvas;
}

/** Composites only the layers below `layerId` (used as the input preview for an adjustment layer). */
export function compositeLayersBelow(layers: Layer[], layerId: string, width: number, height: number): HTMLCanvasElement {
  const index = layers.findIndex((l) => l.id === layerId);
  return compositeAllLayers(index === -1 ? layers : layers.slice(0, index), width, height);
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
