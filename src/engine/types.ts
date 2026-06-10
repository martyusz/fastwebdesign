export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten';

export const BLEND_MODE_TO_COMPOSITE: Record<BlendMode, GlobalCompositeOperation> = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
};

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  /** Offscreen canvas holding this layer's pixel data. */
  canvas: HTMLCanvasElement;
  /** Optional layer mask: alpha channel controls visibility (opaque = visible). */
  mask: HTMLCanvasElement | null;
}

/** Which canvas drawing tools currently target for the active layer. */
export type EditTarget = 'pixels' | 'mask';

export interface Point {
  x: number;
  y: number;
}

/** A polygon-based selection (rectangular marquee selections are 4-point polygons). */
export interface SelectionState {
  kind: 'rect' | 'lasso';
  /** Polygon points in document/canvas coordinates. */
  points: Point[];
  /** Axis-aligned bounding box of the polygon. */
  bounds: { x: number; y: number; width: number; height: number };
}

/** Live preview shown while a drag-based tool is in progress. */
export type ToolPreview =
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'ellipse'; x: number; y: number; width: number; height: number }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'lasso'; points: Point[] }
  | { kind: 'gradient'; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'crop'; x: number; y: number; width: number; height: number };

export type FlipDirection = 'horizontal' | 'vertical';
export type RotateDirection = 'cw' | 'ccw';

export type ToolName =
  | 'move'
  | 'marquee'
  | 'lasso'
  | 'brush'
  | 'eraser'
  | 'pencil'
  | 'bucket'
  | 'gradient'
  | 'eyedropper'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'text'
  | 'crop'
  | 'transform'
  | 'zoom'
  | 'hand';
