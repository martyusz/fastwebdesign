import { create } from 'zustand';
import { createLayer } from '../engine/layer';
import type { Layer, ToolName } from '../engine/types';

interface EditorState {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;

  activeTool: ToolName;
  setActiveTool: (tool: ToolName) => void;

  brushSize: number;
  brushHardness: number;
  brushColor: string;
  setBrushSize: (size: number) => void;
  setBrushHardness: (hardness: number) => void;
  setBrushColor: (color: string) => void;

  zoom: number;
  setZoom: (zoom: number) => void;

  /** Bumped whenever pixel data changes so Konva layers know to redraw. */
  redrawTick: number;
  requestRedraw: () => void;

  toggleLayerVisibility: (layerId: string) => void;
}

const INITIAL_WIDTH = 1024;
const INITIAL_HEIGHT = 640;

export const useEditorStore = create<EditorState>((set) => {
  const baseLayer = createLayer(INITIAL_WIDTH, INITIAL_HEIGHT, 'Background');
  // Fill the background layer with white so the canvas isn't transparent.
  const ctx = baseLayer.canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, INITIAL_WIDTH, INITIAL_HEIGHT);

  return {
    width: INITIAL_WIDTH,
    height: INITIAL_HEIGHT,
    layers: [baseLayer],
    activeLayerId: baseLayer.id,

    activeTool: 'brush',
    setActiveTool: (tool) => set({ activeTool: tool }),

    brushSize: 24,
    brushHardness: 80,
    brushColor: '#7c5cff',
    setBrushSize: (size) => set({ brushSize: size }),
    setBrushHardness: (hardness) => set({ brushHardness: hardness }),
    setBrushColor: (color) => set({ brushColor: color }),

    zoom: 1,
    setZoom: (zoom) => set({ zoom: Math.min(8, Math.max(0.05, zoom)) }),

    redrawTick: 0,
    requestRedraw: () => set((state) => ({ redrawTick: state.redrawTick + 1 })),

    toggleLayerVisibility: (layerId) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
        ),
      })),
  };
});
