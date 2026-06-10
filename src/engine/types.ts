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
}

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
