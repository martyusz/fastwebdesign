import type { ToolName } from '../engine/types';
import { bucketTool } from './bucketTool';
import { gradientTool } from './gradientTool';
import { moveTool } from './moveTool';
import { ellipseTool, lineTool, rectangleTool } from './shapeTools';
import { createStrokeTool } from './strokeTool';
import type { DrawingTool } from './types';

export type { DrawingTool, ToolContext, Point } from './types';

/** Registry of tools that paint directly onto the active layer. */
export const drawingTools: Partial<Record<ToolName, DrawingTool>> = {
  move: moveTool,
  brush: createStrokeTool('source-over'),
  eraser: createStrokeTool('destination-out'),
  pencil: createStrokeTool('source-over', { hardnessAffectsBlur: false }),
  bucket: bucketTool,
  gradient: gradientTool,
  rectangle: rectangleTool,
  ellipse: ellipseTool,
  line: lineTool,
};

/** Tools handled with bespoke pointer logic in CanvasArea rather than the drawingTools registry. */
export const SPECIAL_TOOLS: ToolName[] = ['marquee', 'lasso', 'magicwand', 'colorrange', 'eyedropper', 'text', 'crop'];

export interface ToolDefinition {
  name: ToolName;
  label: string;
  shortcut: string;
  group: number;
}

/** Definitions for the left toolbar. Tools without a registered drawing
 * implementation are shown but inactive until a later phase. */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: 'move', label: 'Move', shortcut: 'V', group: 0 },
  { name: 'marquee', label: 'Marquee', shortcut: 'M', group: 0 },
  { name: 'lasso', label: 'Lasso', shortcut: 'L', group: 0 },
  { name: 'magicwand', label: 'Magic Wand', shortcut: 'W', group: 0 },
  { name: 'colorrange', label: 'Color Range', shortcut: 'D', group: 0 },

  { name: 'brush', label: 'Brush', shortcut: 'B', group: 1 },
  { name: 'eraser', label: 'Eraser', shortcut: 'E', group: 1 },
  { name: 'pencil', label: 'Pencil', shortcut: 'N', group: 1 },
  { name: 'bucket', label: 'Paint Bucket', shortcut: 'G', group: 1 },
  { name: 'gradient', label: 'Gradient', shortcut: 'U', group: 1 },
  { name: 'eyedropper', label: 'Eyedropper', shortcut: 'I', group: 1 },

  { name: 'rectangle', label: 'Rectangle', shortcut: 'R', group: 2 },
  { name: 'ellipse', label: 'Ellipse', shortcut: 'O', group: 2 },
  { name: 'line', label: 'Line', shortcut: 'Y', group: 2 },
  { name: 'text', label: 'Text', shortcut: 'T', group: 2 },

  { name: 'crop', label: 'Crop', shortcut: 'C', group: 3 },
  { name: 'transform', label: 'Transform', shortcut: 'K', group: 3 },

  { name: 'zoom', label: 'Zoom', shortcut: 'Z', group: 4 },
  { name: 'hand', label: 'Hand', shortcut: 'H', group: 4 },
];
