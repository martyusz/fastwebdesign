import { create } from 'zustand';
import { createLayer, createMaskCanvas, duplicateLayer as cloneLayer } from '../engine/layer';
import type { BlendMode, EditTarget, Layer, ToolName } from '../engine/types';
import { useHistoryStore } from './historyStore';

interface EditorState {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerId: string;

  /** Whether brush/eraser/etc. paint onto the active layer's pixels or its mask. */
  activeEditTarget: EditTarget;
  setActiveEditTarget: (target: EditTarget) => void;

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

  selectLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  toggleLayerLock: (layerId: string) => void;
  renameLayer: (layerId: string, name: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  setLayerBlendMode: (layerId: string, blendMode: BlendMode) => void;

  addLayer: () => void;
  deleteLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
  reorderLayer: (fromIndex: number, toIndex: number) => void;

  addLayerMask: (layerId: string) => void;
  removeLayerMask: (layerId: string) => void;
}

const INITIAL_WIDTH = 1024;
const INITIAL_HEIGHT = 640;

function withLayersCommand(
  label: string,
  before: { layers: Layer[]; activeLayerId: string },
  after: { layers: Layer[]; activeLayerId: string },
) {
  useHistoryStore.getState().push({
    label,
    undo: () => useEditorStore.setState({ layers: before.layers, activeLayerId: before.activeLayerId }),
    redo: () => useEditorStore.setState({ layers: after.layers, activeLayerId: after.activeLayerId }),
  });
}

export const useEditorStore = create<EditorState>((set, get) => {
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

    activeEditTarget: 'pixels',
    setActiveEditTarget: (target) => set({ activeEditTarget: target }),

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

    selectLayer: (layerId) => set({ activeLayerId: layerId, activeEditTarget: 'pixels' }),

    toggleLayerVisibility: (layerId) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer,
        ),
      })),

    toggleLayerLock: (layerId) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, locked: !layer.locked } : layer,
        ),
      })),

    renameLayer: (layerId, name) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, name } : layer,
        ),
      })),

    setLayerOpacity: (layerId, opacity) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, opacity: Math.min(1, Math.max(0, opacity)) } : layer,
        ),
      })),

    setLayerBlendMode: (layerId, blendMode) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, blendMode } : layer,
        ),
      })),

    addLayer: () => {
      const state = get();
      const before = { layers: state.layers, activeLayerId: state.activeLayerId };
      const newLayer = createLayer(state.width, state.height);
      const activeIndex = state.layers.findIndex((l) => l.id === state.activeLayerId);
      const insertAt = activeIndex === -1 ? state.layers.length : activeIndex + 1;
      const layers = [
        ...state.layers.slice(0, insertAt),
        newLayer,
        ...state.layers.slice(insertAt),
      ];
      const after = { layers, activeLayerId: newLayer.id };
      set({ ...after, activeEditTarget: 'pixels' });
      withLayersCommand('Add Layer', before, after);
    },

    duplicateLayer: (layerId) => {
      const state = get();
      const before = { layers: state.layers, activeLayerId: state.activeLayerId };
      const index = state.layers.findIndex((l) => l.id === layerId);
      if (index === -1) return;
      const copy = cloneLayer(state.layers[index]);
      const layers = [
        ...state.layers.slice(0, index + 1),
        copy,
        ...state.layers.slice(index + 1),
      ];
      const after = { layers, activeLayerId: copy.id };
      set({ ...after, activeEditTarget: 'pixels' });
      withLayersCommand('Duplicate Layer', before, after);
    },

    deleteLayer: (layerId) => {
      const state = get();
      if (state.layers.length <= 1) return;
      const before = { layers: state.layers, activeLayerId: state.activeLayerId };
      const index = state.layers.findIndex((l) => l.id === layerId);
      if (index === -1) return;
      const layers = state.layers.filter((l) => l.id !== layerId);
      let activeLayerId = state.activeLayerId;
      if (activeLayerId === layerId) {
        const fallback = layers[Math.min(index, layers.length - 1)];
        activeLayerId = fallback.id;
      }
      const after = { layers, activeLayerId };
      set({ ...after, activeEditTarget: 'pixels' });
      withLayersCommand('Delete Layer', before, after);
    },

    reorderLayer: (fromIndex, toIndex) => {
      const state = get();
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.layers.length ||
        toIndex >= state.layers.length
      ) {
        return;
      }
      const before = { layers: state.layers, activeLayerId: state.activeLayerId };
      const layers = [...state.layers];
      const [moved] = layers.splice(fromIndex, 1);
      layers.splice(toIndex, 0, moved);
      const after = { layers, activeLayerId: state.activeLayerId };
      set(after);
      withLayersCommand('Reorder Layers', before, after);
    },

    addLayerMask: (layerId) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId && !layer.mask
            ? { ...layer, mask: createMaskCanvas(state.width, state.height) }
            : layer,
        ),
      })),

    removeLayerMask: (layerId) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, mask: null } : layer,
        ),
        activeEditTarget:
          state.activeLayerId === layerId ? 'pixels' : state.activeEditTarget,
      })),
  };
});
