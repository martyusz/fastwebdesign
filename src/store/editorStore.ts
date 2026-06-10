import { create } from 'zustand';
import {
  cloneCanvasImageData,
  compositeAllLayers,
  createLayer,
  createMaskCanvas,
  duplicateLayer as cloneLayer,
  flipCanvasHorizontal,
  flipCanvasVertical,
  resizeCanvas,
  resizeMaskCanvas,
  restoreCanvasImageData,
  rotateCanvas90,
  scaleCanvas,
} from '../engine/layer';
import { clipToSelection } from '../engine/selection';
import { getFilter } from '../filters';
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

/** 0 = left/top, 1 = center/middle, 2 = right/bottom. */
export type AnchorIndex = 0 | 1 | 2;

export type DocumentDialogState =
  | { mode: 'new'; width: number; height: number; background: 'white' | 'transparent' }
  | { mode: 'image-size'; width: number; height: number; originalWidth: number; originalHeight: number; maintainAspect: boolean }
  | { mode: 'canvas-size'; width: number; height: number; originalWidth: number; originalHeight: number; anchorX: AnchorIndex; anchorY: AnchorIndex }
  | { mode: 'export'; format: 'png' | 'jpeg'; quality: number; filename: string };

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

  /** Open filter dialog (param filters) with its live preview applied to the layer. */
  filterDialog: {
    filterId: string;
    layerId: string;
    editTarget: EditTarget;
    params: Record<string, number>;
  } | null;
  /** Opens the dialog for param filters; applies immediately for instant ones. */
  openFilter: (filterId: string) => void;
  updateFilterParams: (params: Record<string, number>) => void;
  applyFilterDialog: () => void;
  cancelFilterDialog: () => void;

  /** Modal dialog for New Document / Image Size / Canvas Size / Export As. */
  documentDialog: DocumentDialogState | null;
  openNewDocumentDialog: () => void;
  openImageSizeDialog: () => void;
  openCanvasSizeDialog: () => void;
  openExportDialog: () => void;
  updateDocumentDialog: (patch: Record<string, unknown>) => void;
  applyDocumentDialog: () => void;
  cancelDocumentDialog: () => void;

  /** Imports an image file as a new layer placed at the top-left of the canvas. */
  importImageFile: (file: File) => void;
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
  /** Pristine copy of the layer pixels taken when a filter dialog opens, used for preview/cancel. */
  let filterBackup: { original: ImageData; source: HTMLCanvasElement } | null = null;

  function findFilterTarget(layerId: string, editTarget: EditTarget): HTMLCanvasElement | null {
    const layer = get().layers.find((l) => l.id === layerId);
    if (!layer) return null;
    return editTarget === 'mask' ? layer.mask : layer.canvas;
  }

  /** Draws the filtered source onto the target, limited to the active selection. */
  function renderFilterResult(
    target: HTMLCanvasElement,
    source: HTMLCanvasElement,
    filterId: string,
    params: Record<string, number>,
  ) {
    const filter = getFilter(filterId);
    if (!filter) return;
    const filtered = filter.apply(source, params);
    const ctx = target.getContext('2d')!;
    ctx.save();
    clipToSelection(ctx, get().selection);
    ctx.clearRect(0, 0, target.width, target.height);
    ctx.drawImage(filtered, 0, 0);
    ctx.restore();
  }

  function pushFilterCommand(label: string, layerId: string, editTarget: EditTarget, before: ImageData, after: ImageData) {
    useHistoryStore.getState().push({
      label,
      undo: () => {
        const canvas = findFilterTarget(layerId, editTarget);
        if (!canvas) return;
        restoreCanvasImageData(canvas, before);
        useEditorStore.getState().requestRedraw();
      },
      redo: () => {
        const canvas = findFilterTarget(layerId, editTarget);
        if (!canvas) return;
        restoreCanvasImageData(canvas, after);
        useEditorStore.getState().requestRedraw();
      },
    });
  }

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

    filterDialog: null,

    openFilter: (filterId) => {
      const state = get();
      const filter = getFilter(filterId);
      if (!filter || state.filterDialog) return;

      const layer = state.layers.find((l) => l.id === state.activeLayerId);
      if (!layer || layer.locked || !layer.visible) return;
      const target = state.activeEditTarget === 'mask' ? layer.mask : layer.canvas;
      if (!target) return;

      const original = cloneCanvasImageData(target);
      const source = document.createElement('canvas');
      source.width = target.width;
      source.height = target.height;
      source.getContext('2d')!.drawImage(target, 0, 0);

      const params = Object.fromEntries(filter.params.map((p) => [p.id, p.defaultValue]));

      if (filter.params.length === 0) {
        renderFilterResult(target, source, filterId, params);
        get().requestRedraw();
        pushFilterCommand(filter.label, layer.id, state.activeEditTarget, original, cloneCanvasImageData(target));
        return;
      }

      filterBackup = { original, source };
      set({ filterDialog: { filterId, layerId: layer.id, editTarget: state.activeEditTarget, params } });
      renderFilterResult(target, source, filterId, params);
      get().requestRedraw();
    },

    updateFilterParams: (params) => {
      const dialog = get().filterDialog;
      if (!dialog || !filterBackup) return;
      const target = findFilterTarget(dialog.layerId, dialog.editTarget);
      if (!target) return;
      const merged = { ...dialog.params, ...params };
      set({ filterDialog: { ...dialog, params: merged } });
      renderFilterResult(target, filterBackup.source, dialog.filterId, merged);
      get().requestRedraw();
    },

    applyFilterDialog: () => {
      const dialog = get().filterDialog;
      if (!dialog || !filterBackup) return;
      const target = findFilterTarget(dialog.layerId, dialog.editTarget);
      const filter = getFilter(dialog.filterId);
      if (target && filter) {
        pushFilterCommand(filter.label, dialog.layerId, dialog.editTarget, filterBackup.original, cloneCanvasImageData(target));
      }
      filterBackup = null;
      set({ filterDialog: null });
    },

    cancelFilterDialog: () => {
      const dialog = get().filterDialog;
      if (dialog && filterBackup) {
        const target = findFilterTarget(dialog.layerId, dialog.editTarget);
        if (target) restoreCanvasImageData(target, filterBackup.original);
        get().requestRedraw();
      }
      filterBackup = null;
      set({ filterDialog: null });
    },

    documentDialog: null,

    openNewDocumentDialog: () => {
      const state = get();
      if (state.documentDialog) return;
      set({ documentDialog: { mode: 'new', width: state.width, height: state.height, background: 'white' } });
    },

    openImageSizeDialog: () => {
      const state = get();
      if (state.documentDialog) return;
      set({
        documentDialog: {
          mode: 'image-size',
          width: state.width,
          height: state.height,
          originalWidth: state.width,
          originalHeight: state.height,
          maintainAspect: true,
        },
      });
    },

    openCanvasSizeDialog: () => {
      const state = get();
      if (state.documentDialog) return;
      set({
        documentDialog: {
          mode: 'canvas-size',
          width: state.width,
          height: state.height,
          originalWidth: state.width,
          originalHeight: state.height,
          anchorX: 1,
          anchorY: 1,
        },
      });
    },

    openExportDialog: () => {
      const state = get();
      if (state.documentDialog) return;
      set({ documentDialog: { mode: 'export', format: 'png', quality: 0.92, filename: 'pixelforge-export' } });
    },

    updateDocumentDialog: (patch) => {
      const dialog = get().documentDialog;
      if (!dialog) return;
      set({ documentDialog: { ...dialog, ...patch } as DocumentDialogState });
    },

    cancelDocumentDialog: () => set({ documentDialog: null }),

    applyDocumentDialog: () => {
      const dialog = get().documentDialog;
      if (!dialog) return;

      if (dialog.mode === 'new') {
        const width = Math.max(1, Math.round(dialog.width));
        const height = Math.max(1, Math.round(dialog.height));
        const layer = createLayer(width, height, 'Background');
        if (dialog.background === 'white') {
          const ctx = layer.canvas.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        }
        useHistoryStore.getState().reset();
        set({
          width,
          height,
          layers: [layer],
          activeLayerId: layer.id,
          activeEditTarget: 'pixels',
          selection: null,
          toolPreview: null,
          cropRect: null,
          filterDialog: null,
          zoom: 1,
          documentDialog: null,
        });
        get().requestRedraw();
        return;
      }

      if (dialog.mode === 'image-size') {
        const width = Math.max(1, Math.round(dialog.width));
        const height = Math.max(1, Math.round(dialog.height));
        const state = get();
        const before = { layers: state.layers, width: state.width, height: state.height };
        const layers = state.layers.map((layer) => ({
          ...layer,
          canvas: scaleCanvas(layer.canvas, width, height),
          mask: layer.mask ? scaleCanvas(layer.mask, width, height) : null,
        }));
        const after = { layers, width, height };
        set({ ...after, documentDialog: null });
        get().requestRedraw();

        useHistoryStore.getState().push({
          label: 'Image Size',
          undo: () => {
            useEditorStore.setState({ layers: before.layers, width: before.width, height: before.height });
            useEditorStore.getState().requestRedraw();
          },
          redo: () => {
            useEditorStore.setState({ layers: after.layers, width: after.width, height: after.height });
            useEditorStore.getState().requestRedraw();
          },
        });
        return;
      }

      if (dialog.mode === 'canvas-size') {
        const width = Math.max(1, Math.round(dialog.width));
        const height = Math.max(1, Math.round(dialog.height));
        const state = get();
        const offsetX = Math.round((width - state.width) * (dialog.anchorX / 2));
        const offsetY = Math.round((height - state.height) * (dialog.anchorY / 2));
        const before = { layers: state.layers, width: state.width, height: state.height };
        const layers = state.layers.map((layer) => ({
          ...layer,
          canvas: resizeCanvas(layer.canvas, width, height, offsetX, offsetY),
          mask: layer.mask ? resizeMaskCanvas(layer.mask, width, height, offsetX, offsetY) : null,
        }));
        const after = { layers, width, height };
        set({ ...after, documentDialog: null, selection: null });
        get().requestRedraw();

        useHistoryStore.getState().push({
          label: 'Canvas Size',
          undo: () => {
            useEditorStore.setState({ layers: before.layers, width: before.width, height: before.height });
            useEditorStore.getState().requestRedraw();
          },
          redo: () => {
            useEditorStore.setState({ layers: after.layers, width: after.width, height: after.height });
            useEditorStore.getState().requestRedraw();
          },
        });
        return;
      }

      if (dialog.mode === 'export') {
        const state = get();
        const composite = compositeAllLayers(state.layers, state.width, state.height);
        const mimeType = dialog.format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const extension = dialog.format === 'jpeg' ? 'jpg' : 'png';
        const quality = dialog.format === 'jpeg' ? dialog.quality : undefined;

        if (dialog.format === 'jpeg') {
          // JPEG has no alpha channel; flatten onto white first.
          const flattened = document.createElement('canvas');
          flattened.width = state.width;
          flattened.height = state.height;
          const ctx = flattened.getContext('2d')!;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, state.width, state.height);
          ctx.drawImage(composite, 0, 0);
          flattened.toBlob(
            (blob) => {
              if (blob) downloadBlob(blob, `${dialog.filename || 'pixelforge-export'}.${extension}`);
            },
            mimeType,
            quality,
          );
        } else {
          composite.toBlob((blob) => {
            if (blob) downloadBlob(blob, `${dialog.filename || 'pixelforge-export'}.${extension}`);
          }, mimeType);
        }

        set({ documentDialog: null });
        return;
      }
    },

    importImageFile: (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const state = get();
          const before = { layers: state.layers, activeLayerId: state.activeLayerId };
          const layer = createLayer(state.width, state.height, file.name.replace(/\.[^.]+$/, ''));
          layer.canvas.getContext('2d')!.drawImage(img, 0, 0);
          const index = state.layers.findIndex((l) => l.id === state.activeLayerId);
          const insertAt = index === -1 ? state.layers.length : index + 1;
          const layers = [
            ...state.layers.slice(0, insertAt),
            layer,
            ...state.layers.slice(insertAt),
          ];
          const after = { layers, activeLayerId: layer.id };
          set({ ...after, activeEditTarget: 'pixels' });
          get().requestRedraw();
          withLayersCommand('Place Image', before, after);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    },
  };
});

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
