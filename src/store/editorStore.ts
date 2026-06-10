import { create } from 'zustand';
import {
  cloneCanvasImageData,
  createLayer,
  createMaskCanvas,
  duplicateLayer as cloneLayer,
  flipCanvasHorizontal,
  flipCanvasVertical,
  restoreCanvasImageData,
  rotateCanvas90,
} from '../engine/layer';
import { clipToSelection } from '../engine/selection';
import type {
  BlendMode,
  EditTarget,
  FlipDirection,
  Layer,
  Point,
  RotateDirection,
  SelectionState,
  ToolName,
  ToolPreview,
} from '../engine/types';
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

  /** Active marquee/lasso selection that paint operations are clipped to. */
  selection: SelectionState | null;
  setSelection: (selection: SelectionState | null) => void;
  clearSelection: () => void;

  /** Live preview shown while a drag-based tool (shape, gradient, marquee, lasso, crop) is active. */
  toolPreview: ToolPreview | null;
  setToolPreview: (preview: ToolPreview | null) => void;

  /** Secondary color, used as the gradient tool's end stop. */
  secondaryColor: string;
  setSecondaryColor: (color: string) => void;

  fontFamily: string;
  fontSize: number;
  textAlign: CanvasTextAlign;
  setFontFamily: (font: string) => void;
  setFontSize: (size: number) => void;
  setTextAlign: (align: CanvasTextAlign) => void;

  /** In-progress on-canvas text editor (text tool). */
  textEditor: { x: number; y: number; value: string } | null;
  openTextEditor: (point: Point) => void;
  updateTextEditorValue: (value: string) => void;
  commitTextEditor: () => void;
  cancelTextEditor: () => void;

  /** Pending crop rectangle (crop tool), in document coordinates. */
  cropRect: { x: number; y: number; width: number; height: number } | null;
  setCropRect: (rect: { x: number; y: number; width: number; height: number } | null) => void;
  applyCrop: () => void;
  cancelCrop: () => void;

  flipActiveLayer: (direction: FlipDirection) => void;
  rotateActiveLayer: (direction: RotateDirection) => void;
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

    selection: null,
    setSelection: (selection) => set({ selection }),
    clearSelection: () => set({ selection: null }),

    toolPreview: null,
    setToolPreview: (preview) => set({ toolPreview: preview }),

    secondaryColor: '#ffffff',
    setSecondaryColor: (color) => set({ secondaryColor: color }),

    fontFamily: 'Inter, sans-serif',
    fontSize: 48,
    textAlign: 'left',
    setFontFamily: (font) => set({ fontFamily: font }),
    setFontSize: (size) => set({ fontSize: Math.max(1, size) }),
    setTextAlign: (align) => set({ textAlign: align }),

    textEditor: null,
    openTextEditor: (point) => set({ textEditor: { x: point.x, y: point.y, value: '' } }),
    updateTextEditorValue: (value) =>
      set((state) => (state.textEditor ? { textEditor: { ...state.textEditor, value } } : {})),
    cancelTextEditor: () => set({ textEditor: null }),

    commitTextEditor: () => {
      const state = get();
      const editor = state.textEditor;
      if (!editor || !editor.value.trim()) {
        set({ textEditor: null });
        return;
      }
      const layer = state.layers.find((l) => l.id === state.activeLayerId);
      if (!layer) {
        set({ textEditor: null });
        return;
      }
      const target = state.activeEditTarget === 'mask' ? layer.mask : layer.canvas;
      if (!target) {
        set({ textEditor: null });
        return;
      }

      const before = cloneCanvasImageData(target);
      const ctx = target.getContext('2d')!;
      ctx.save();
      clipToSelection(ctx, state.selection);
      ctx.fillStyle = state.brushColor;
      ctx.font = `${state.fontSize}px ${state.fontFamily}`;
      ctx.textAlign = state.textAlign;
      ctx.textBaseline = 'top';
      const lineHeight = state.fontSize * 1.2;
      editor.value.split('\n').forEach((line, i) => {
        ctx.fillText(line, editor.x, editor.y + i * lineHeight);
      });
      ctx.restore();
      const after = cloneCanvasImageData(target);

      set({ textEditor: null });
      get().requestRedraw();

      const layerId = layer.id;
      const editTarget = state.activeEditTarget;
      useHistoryStore.getState().push({
        label: 'Add Text',
        undo: () => {
          const l = useEditorStore.getState().layers.find((l) => l.id === layerId);
          const canvas = editTarget === 'mask' ? l?.mask : l?.canvas;
          if (!canvas) return;
          restoreCanvasImageData(canvas, before);
          useEditorStore.getState().requestRedraw();
        },
        redo: () => {
          const l = useEditorStore.getState().layers.find((l) => l.id === layerId);
          const canvas = editTarget === 'mask' ? l?.mask : l?.canvas;
          if (!canvas) return;
          restoreCanvasImageData(canvas, after);
          useEditorStore.getState().requestRedraw();
        },
      });
    },

    cropRect: null,
    setCropRect: (rect) => set({ cropRect: rect }),
    cancelCrop: () => set({ cropRect: null }),

    applyCrop: () => {
      const state = get();
      const rect = state.cropRect;
      if (!rect) return;

      const x = Math.max(0, Math.min(state.width, Math.round(rect.x)));
      const y = Math.max(0, Math.min(state.height, Math.round(rect.y)));
      const width = Math.max(1, Math.min(state.width - x, Math.round(rect.width)));
      const height = Math.max(1, Math.min(state.height - y, Math.round(rect.height)));

      if (width < 2 || height < 2) {
        set({ cropRect: null });
        return;
      }

      const before = { layers: state.layers, width: state.width, height: state.height };

      function cropCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(source, -x, -y);
        return canvas;
      }

      const layers = state.layers.map((layer) => ({
        ...layer,
        canvas: cropCanvas(layer.canvas),
        mask: layer.mask ? cropCanvas(layer.mask) : null,
      }));

      const after = { layers, width, height };
      set({ ...after, cropRect: null, selection: null });
      get().requestRedraw();

      useHistoryStore.getState().push({
        label: 'Crop Canvas',
        undo: () => {
          useEditorStore.setState({ layers: before.layers, width: before.width, height: before.height });
          useEditorStore.getState().requestRedraw();
        },
        redo: () => {
          useEditorStore.setState({ layers: after.layers, width: after.width, height: after.height });
          useEditorStore.getState().requestRedraw();
        },
      });
    },

    flipActiveLayer: (direction) => {
      const state = get();
      const layer = state.layers.find((l) => l.id === state.activeLayerId);
      if (!layer) return;

      const flip = direction === 'horizontal' ? flipCanvasHorizontal : flipCanvasVertical;
      const newCanvas = flip(layer.canvas);
      const newMask = layer.mask ? flip(layer.mask) : null;
      const oldCanvas = layer.canvas;
      const oldMask = layer.mask;
      const layerId = layer.id;

      set((s) => ({
        layers: s.layers.map((l) => (l.id === layerId ? { ...l, canvas: newCanvas, mask: newMask } : l)),
      }));
      get().requestRedraw();

      useHistoryStore.getState().push({
        label: direction === 'horizontal' ? 'Flip Horizontal' : 'Flip Vertical',
        undo: () => {
          useEditorStore.setState((s) => ({
            layers: s.layers.map((l) => (l.id === layerId ? { ...l, canvas: oldCanvas, mask: oldMask } : l)),
          }));
          useEditorStore.getState().requestRedraw();
        },
        redo: () => {
          useEditorStore.setState((s) => ({
            layers: s.layers.map((l) => (l.id === layerId ? { ...l, canvas: newCanvas, mask: newMask } : l)),
          }));
          useEditorStore.getState().requestRedraw();
        },
      });
    },

    rotateActiveLayer: (direction) => {
      const state = get();
      const layer = state.layers.find((l) => l.id === state.activeLayerId);
      if (!layer) return;

      const newCanvas = rotateCanvas90(layer.canvas, direction);
      const newMask = layer.mask ? rotateCanvas90(layer.mask, direction) : null;
      const oldCanvas = layer.canvas;
      const oldMask = layer.mask;
      const layerId = layer.id;

      set((s) => ({
        layers: s.layers.map((l) => (l.id === layerId ? { ...l, canvas: newCanvas, mask: newMask } : l)),
      }));
      get().requestRedraw();

      useHistoryStore.getState().push({
        label: direction === 'cw' ? 'Rotate 90° CW' : 'Rotate 90° CCW',
        undo: () => {
          useEditorStore.setState((s) => ({
            layers: s.layers.map((l) => (l.id === layerId ? { ...l, canvas: oldCanvas, mask: oldMask } : l)),
          }));
          useEditorStore.getState().requestRedraw();
        },
        redo: () => {
          useEditorStore.setState((s) => ({
            layers: s.layers.map((l) => (l.id === layerId ? { ...l, canvas: newCanvas, mask: newMask } : l)),
          }));
          useEditorStore.getState().requestRedraw();
        },
      });
    },
  };
});
