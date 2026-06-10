import type { SolidLayer, Transform } from '../engine/types';

let layerCounter = 0;

export function defaultTransform(): Transform {
  return { x: 0, y: 0, scale: 100, rotation: 0, opacity: 100 };
}

export function createSolidLayer(
  width: number,
  height: number,
  color: string,
  name?: string,
): SolidLayer {
  layerCounter += 1;
  return {
    id: crypto.randomUUID(),
    name: name ?? `Solid ${layerCounter}`,
    type: 'solid',
    visible: true,
    locked: false,
    transform: defaultTransform(),
    color,
    width,
    height,
  };
}
