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
  /** If set, this is a non-destructive adjustment layer affecting layers below it. */
  adjustment: AdjustmentLayerData | null;
}

export type AdjustmentType =
  | 'curves'
  | 'levels'
  | 'brightness-contrast'
  | 'hue-saturation'
  | 'color-balance'
  | 'exposure'
  | 'vibrance';

/** A control point for a tone curve, in 0-255 input/output space. */
export interface CurvePoint {
  x: number;
  y: number;
}

export interface CurvesSettings {
  rgb: CurvePoint[];
  r: CurvePoint[];
  g: CurvePoint[];
  b: CurvePoint[];
}

export interface LevelsSettings {
  inputBlack: number;
  inputWhite: number;
  gamma: number;
  outputBlack: number;
  outputWhite: number;
}

export interface BrightnessContrastSettings {
  brightness: number;
  contrast: number;
}

export interface HueSaturationSettings {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface ColorBalanceSettings {
  cyanRed: number;
  magentaGreen: number;
  yellowBlue: number;
  preserveLuminosity: boolean;
}

export interface ExposureSettings {
  exposure: number;
  offset: number;
  gamma: number;
}

export interface VibranceSettings {
  vibrance: number;
  saturation: number;
}

export interface AdjustmentSettingsMap {
  curves: CurvesSettings;
  levels: LevelsSettings;
  'brightness-contrast': BrightnessContrastSettings;
  'hue-saturation': HueSaturationSettings;
  'color-balance': ColorBalanceSettings;
  exposure: ExposureSettings;
  vibrance: VibranceSettings;
}

export interface AdjustmentLayerData {
  type: AdjustmentType;
  settings: AdjustmentSettingsMap[AdjustmentType];
  /** When true, only affects the layer directly below it (clipping mask), not the whole stack below. */
  clipToBelow: boolean;
}


/** Which canvas drawing tools currently target for the active layer. */
export type EditTarget = 'pixels' | 'mask';

export interface Point {
  x: number;
  y: number;
}

/** A polygon- or raster-based selection. */
export interface SelectionState {
  kind: 'rect' | 'lasso' | 'mask';
  /** Polygon points in document/canvas coordinates (unused for 'mask'). */
  points: Point[];
  /** Axis-aligned bounding box of the selected area. */
  bounds: { x: number; y: number; width: number; height: number };
  /** For kind 'mask': a full-document-size grayscale canvas whose alpha channel is the selection strength (255 = fully selected). */
  mask?: HTMLCanvasElement;
  /** For kind 'mask': traced outline loops (in document pixel coordinates) for marching-ants rendering. */
  contours?: Point[][];
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
  | 'magicwand'
  | 'colorrange'
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
