export type LayerType = 'solid' | 'shape' | 'text' | 'image';

export interface Transform {
  x: number;
  y: number;
  /** Percent scale, 100 = original size. */
  scale: number;
  /** Degrees. */
  rotation: number;
  /** 0-100. */
  opacity: number;
}

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  transform: Transform;
}

export interface SolidLayer extends BaseLayer {
  type: 'solid';
  color: string;
  width: number;
  height: number;
}

export type Layer = SolidLayer;

export interface Composition {
  width: number;
  height: number;
  fps: number;
  durationFrames: number;
}
