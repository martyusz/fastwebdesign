import Konva from 'konva';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Ellipse, Image as KonvaImage, Layer as KonvaLayer, Line, Rect, Stage } from 'react-konva';
import {
  cloneCanvasImageData,
  compositeAllLayers,
  compositeLayerWithMask,
  restoreCanvasImageData,
} from '../engine/layer';
import { lassoSelection, rectSelection } from '../engine/selection';
import { BLEND_MODE_TO_COMPOSITE } from '../engine/types';
import type { Point } from '../engine/types';
import { useEditorStore } from '../store/editorStore';
import { useHistoryStore } from '../store/historyStore';
import { drawingTools } from '../tools';

const ZOOM_STEP = 1.08;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

const TEXT_ALIGN_TO_CSS: Record<CanvasTextAlign, 'left' | 'center' | 'right'> = {
  left: 'left',
  center: 'center',
  right: 'right',
  start: 'left',
  end: 'right',
};

export function CanvasArea() {
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const activeEditTarget = useEditorStore((s) => s.activeEditTarget);
  const activeTool = useEditorStore((s) => s.activeTool);
  const brushSize = useEditorStore((s) => s.brushSize);
  const brushHardness = useEditorStore((s) => s.brushHardness);
  const brushColor = useEditorStore((s) => s.brushColor);
  const setBrushColor = useEditorStore((s) => s.setBrushColor);
  const secondaryColor = useEditorStore((s) => s.secondaryColor);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestRedraw = useEditorStore((s) => s.requestRedraw);

  const selection = useEditorStore((s) => s.selection);
  const setSelection = useEditorStore((s) => s.setSelection);
  const toolPreview = useEditorStore((s) => s.toolPreview);
  const setToolPreview = useEditorStore((s) => s.setToolPreview);
  const magicWandSelect = useEditorStore((s) => s.magicWandSelect);
  const colorRangeSelect = useEditorStore((s) => s.colorRangeSelect);
  const quickMaskMode = useEditorStore((s) => s.quickMaskMode);
  const quickMaskCanvas = useEditorStore((s) => s.quickMaskCanvas);

  const fontFamily = useEditorStore((s) => s.fontFamily);
  const fontSize = useEditorStore((s) => s.fontSize);
  const textAlign = useEditorStore((s) => s.textAlign);
  const textEditor = useEditorStore((s) => s.textEditor);
  const openTextEditor = useEditorStore((s) => s.openTextEditor);
  const updateTextEditorValue = useEditorStore((s) => s.updateTextEditorValue);
  const commitTextEditor = useEditorStore((s) => s.commitTextEditor);
  const cancelTextEditor = useEditorStore((s) => s.cancelTextEditor);

  const cropRect = useEditorStore((s) => s.cropRect);
  const setCropRect = useEditorStore((s) => s.setCropRect);
  const applyCrop = useEditorStore((s) => s.applyCrop);
  const cancelCrop = useEditorStore((s) => s.cancelCrop);

  const activePreset = useEditorStore((s) => s.activePreset);
  const showSafeZone = useEditorStore((s) => s.showSafeZone);

  const push = useHistoryStore((s) => s.push);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const imageRefs = useRef<Map<string, Konva.Image>>(new Map());
  const compositeCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const quickMaskDisplayRef = useRef<HTMLCanvasElement | null>(null);
  const beforeSnapshot = useRef<ImageData | null>(null);
  const isPainting = useRef(false);
  const hasCentered = useRef(false);
  const dragStart = useRef<Point | null>(null);
  const lassoPoints = useRef<Point[]>([]);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [marchOffset, setMarchOffset] = useState(0);

  // Animate the "marching ants" dash offset for selection/crop overlays.
  useEffect(() => {
    const id = window.setInterval(() => setMarchOffset((o) => (o + 1) % 16), 80);
    return () => window.clearInterval(id);
  }, []);

  // Track container size for the stage.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Center the canvas the first time we know the container's size.
  useEffect(() => {
    if (hasCentered.current) return;
    if (containerSize.width === 0 || containerSize.height === 0) return;
    hasCentered.current = true;
    setStagePos({
      x: (containerSize.width - width * zoom) / 2,
      y: (containerSize.height - height * zoom) / 2,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerSize]);

  // Hold space to temporarily pan, like Photoshop.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Space' && !e.repeat) {
        const target = e.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
        e.preventDefault();
        setSpacePressed(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') setSpacePressed(false);
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  function getRelativePoint(): Point | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getRelativePointerPosition();
    return pos ?? null;
  }

  /** Returns the canvas Konva should draw for a layer (composited with its mask, if any). */
  function getDisplayCanvas(layer: (typeof layers)[number]): HTMLCanvasElement {
    if (!layer.mask) return layer.canvas;
    let composite = compositeCanvases.current.get(layer.id);
    if (!composite) {
      composite = document.createElement('canvas');
      compositeCanvases.current.set(layer.id, composite);
    }
    return composite;
  }

  function updateComposites() {
    for (const layer of layers) {
      if (layer.mask) {
        compositeLayerWithMask(layer, getDisplayCanvas(layer));
      }
    }
  }

  // Recompute mask composites whenever the layer list changes (add/remove/mask toggle).
  useEffect(() => {
    updateComposites();
    stageRef.current?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers]);

  // Redraw the stage when pixel data changes outside the pointer-driven paint flow
  // (e.g. committing the text tool), which mutates canvases without a `layers` reference change.
  const redrawTick = useEditorStore((s) => s.redrawTick);
  useEffect(() => {
    updateComposites();
    stageRef.current?.batchDraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redrawTick]);

  function redrawCanvas() {
    updateComposites();
    requestRedraw();
    stageRef.current?.batchDraw();
  }

  /** Returns the pixel buffer that drawing tools should paint onto for a layer. */
  function getEditTarget(layer: (typeof layers)[number]): HTMLCanvasElement | null {
    if (quickMaskMode) return quickMaskCanvas;
    return activeEditTarget === 'mask' ? layer.mask : layer.canvas;
  }

  /** Renders the quick mask buffer tinted red, for the Quick Mask overlay. */
  function getQuickMaskDisplay(): HTMLCanvasElement | null {
    if (!quickMaskCanvas) return null;
    let display = quickMaskDisplayRef.current;
    if (!display) {
      display = document.createElement('canvas');
      quickMaskDisplayRef.current = display;
    }
    display.width = quickMaskCanvas.width;
    display.height = quickMaskCanvas.height;
    const ctx = display.getContext('2d')!;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(0, 0, display.width, display.height);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(quickMaskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return display;
  }

  const isPanning = activeTool === 'hand' || spacePressed;
  const activeDrawingTool = drawingTools[activeTool];

  function pushPaintCommand(layerId: string, editTarget: typeof activeEditTarget, label: string, before: ImageData, after: ImageData) {
    push({
      label,
      undo: () => {
        const target = useEditorStore.getState().layers.find((l) => l.id === layerId);
        const canvas = editTarget === 'mask' ? target?.mask : target?.canvas;
        if (!canvas) return;
        restoreCanvasImageData(canvas, before);
        redrawCanvas();
      },
      redo: () => {
        const target = useEditorStore.getState().layers.find((l) => l.id === layerId);
        const canvas = editTarget === 'mask' ? target?.mask : target?.canvas;
        if (!canvas) return;
        restoreCanvasImageData(canvas, after);
        redrawCanvas();
      },
    });
  }

  function handlePointerDown() {
    if (isPanning) return;
    const point = getRelativePoint();
    if (!point) return;

    if (activeTool === 'eyedropper') {
      const composite = compositeAllLayers(layers, width, height);
      const x = Math.floor(point.x);
      const y = Math.floor(point.y);
      if (x >= 0 && y >= 0 && x < width && y < height) {
        const [r, g, b, a] = composite.getContext('2d')!.getImageData(x, y, 1, 1).data;
        if (a > 0) {
          const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
          setBrushColor(hex);
        }
      }
      return;
    }

    if (activeTool === 'text') {
      if (textEditor) commitTextEditor();
      const layer = layers.find((l) => l.id === activeLayerId);
      if (!layer || layer.locked || !layer.visible) return;
      openTextEditor(point);
      return;
    }

    if (activeTool === 'magicwand' && !quickMaskMode) {
      magicWandSelect(point);
      return;
    }

    if (activeTool === 'colorrange' && !quickMaskMode) {
      colorRangeSelect(point);
      return;
    }

    if (activeTool === 'marquee') {
      dragStart.current = point;
      setToolPreview({ kind: 'rect', x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }

    if (activeTool === 'lasso') {
      lassoPoints.current = [point];
      setToolPreview({ kind: 'lasso', points: lassoPoints.current });
      return;
    }

    if (activeTool === 'crop') {
      dragStart.current = point;
      setCropRect({ x: point.x, y: point.y, width: 0, height: 0 });
      return;
    }

    const tool = activeDrawingTool;
    if (!tool) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    if (!quickMaskMode && (layer.locked || !layer.visible)) return;
    const target = getEditTarget(layer);
    if (!target) return;

    isPainting.current = true;
    beforeSnapshot.current = cloneCanvasImageData(target);
    const color = quickMaskMode ? '#ffffff' : brushColor;
    tool.onPointerDown({ layer, target, point, brushSize, brushHardness, brushColor: color, secondaryColor, selection: quickMaskMode ? null : selection });
    redrawCanvas();
  }

  function handlePointerMove() {
    const point = getRelativePoint();

    if (activeTool === 'marquee' && dragStart.current && point) {
      const start = dragStart.current;
      setToolPreview({
        kind: 'rect',
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(point.x - start.x),
        height: Math.abs(point.y - start.y),
      });
      return;
    }

    if (activeTool === 'lasso' && lassoPoints.current.length && point) {
      lassoPoints.current = [...lassoPoints.current, point];
      setToolPreview({ kind: 'lasso', points: lassoPoints.current });
      return;
    }

    if (activeTool === 'crop' && dragStart.current && point) {
      const start = dragStart.current;
      setCropRect({
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(point.x - start.x),
        height: Math.abs(point.y - start.y),
      });
      return;
    }

    if (!isPainting.current || !point) return;
    const tool = activeDrawingTool;
    if (!tool) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    const target = getEditTarget(layer);
    if (!target) return;

    const color = quickMaskMode ? '#ffffff' : brushColor;
    tool.onPointerMove({ layer, target, point, brushSize, brushHardness, brushColor: color, secondaryColor, selection: quickMaskMode ? null : selection });
    redrawCanvas();
  }

  function handlePointerUp() {
    if (activeTool === 'marquee' && dragStart.current) {
      const preview = useEditorStore.getState().toolPreview;
      dragStart.current = null;
      setToolPreview(null);
      if (preview && preview.kind === 'rect' && preview.width >= 1 && preview.height >= 1) {
        setSelection(rectSelection({ x: preview.x, y: preview.y }, { x: preview.x + preview.width, y: preview.y + preview.height }));
      } else {
        setSelection(null);
      }
      return;
    }

    if (activeTool === 'lasso' && lassoPoints.current.length) {
      const points = lassoPoints.current;
      lassoPoints.current = [];
      setToolPreview(null);
      setSelection(lassoSelection(points));
      return;
    }

    if (activeTool === 'crop') {
      dragStart.current = null;
      return;
    }

    if (!isPainting.current) return;
    const point = getRelativePoint() ?? { x: 0, y: 0 };
    const tool = activeDrawingTool;
    const layer = layers.find((l) => l.id === activeLayerId);
    const target = layer ? getEditTarget(layer) : null;
    isPainting.current = false;

    const color = quickMaskMode ? '#ffffff' : brushColor;
    if (tool && layer && target) {
      tool.onPointerUp({ layer, target, point, brushSize, brushHardness, brushColor: color, secondaryColor, selection: quickMaskMode ? null : selection });
    }

    if (layer && target && beforeSnapshot.current && !quickMaskMode) {
      const before = beforeSnapshot.current;
      const after = cloneCanvasImageData(target);
      const labels: Partial<Record<typeof activeTool, string>> = {
        eraser: 'Erase',
        bucket: 'Fill',
        gradient: 'Gradient',
        rectangle: 'Draw Rectangle',
        ellipse: 'Draw Ellipse',
        line: 'Draw Line',
        move: 'Move',
      };
      pushPaintCommand(layer.id, activeEditTarget, labels[activeTool] ?? 'Brush Stroke', before, after);
    }

    beforeSnapshot.current = null;
    redrawCanvas();
  }

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const oldScale = zoom;
    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const rawScale = direction > 0 ? oldScale * ZOOM_STEP : oldScale / ZOOM_STEP;
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, rawScale));

    setZoom(newScale);
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  }

  function handleDragEnd(e: Konva.KonvaEventObject<DragEvent>) {
    setStagePos({ x: e.target.x(), y: e.target.y() });
  }

  let cursor = 'default';
  if (isPanning) cursor = 'grab';
  else if (activeTool === 'text') cursor = 'text';
  else if (activeTool === 'eyedropper') cursor = 'crosshair';
  else if (activeDrawingTool || ['marquee', 'lasso', 'crop', 'magicwand', 'colorrange'].includes(activeTool)) cursor = 'crosshair';
  else if (activeTool === 'zoom') cursor = 'zoom-in';

  const dash = [6, 4];

  // Text editor screen position/size.
  const textScreen = textEditor
    ? { x: stagePos.x + textEditor.x * zoom, y: stagePos.y + textEditor.y * zoom }
    : null;
  const textTranslate =
    textAlign === 'center' ? '-50%' : textAlign === 'right' || textAlign === 'end' ? '-100%' : '0';

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-w-0 bg-[#0d0d0f] overflow-hidden"
      style={{
        cursor,
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }}
    >
      {containerSize.width > 0 && (
        <Stage
          ref={stageRef}
          width={containerSize.width}
          height={containerSize.height}
          scaleX={zoom}
          scaleY={zoom}
          x={stagePos.x}
          y={stagePos.y}
          draggable={isPanning}
          onDragEnd={handleDragEnd}
          onWheel={handleWheel}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        >
          <KonvaLayer listening={false}>
            {/* Canvas bounds + drop shadow */}
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              fill="#ffffff"
              shadowColor="black"
              shadowBlur={30}
              shadowOpacity={0.6}
              shadowOffsetY={6}
            />
          </KonvaLayer>
          <KonvaLayer listening={false} clipX={0} clipY={0} clipWidth={width} clipHeight={height}>
            {layers.map(
              (layer) =>
                layer.visible && (
                  <KonvaImage
                    key={layer.id}
                    ref={(node) => {
                      if (node) imageRefs.current.set(layer.id, node);
                      else imageRefs.current.delete(layer.id);
                    }}
                    image={getDisplayCanvas(layer)}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    opacity={layer.opacity}
                    globalCompositeOperation={BLEND_MODE_TO_COMPOSITE[layer.blendMode]}
                  />
                ),
            )}
            {quickMaskMode && quickMaskCanvas && (
              <KonvaImage
                image={getQuickMaskDisplay() ?? undefined}
                x={0}
                y={0}
                width={width}
                height={height}
                opacity={0.5}
                listening={false}
              />
            )}
          </KonvaLayer>
          <KonvaLayer listening={false}>
            <Rect
              x={0}
              y={0}
              width={width}
              height={height}
              stroke="rgba(255,255,255,0.15)"
              strokeWidth={1 / zoom}
            />

            {/* Shape / gradient / lasso drag previews */}
            {toolPreview?.kind === 'rect' && activeTool !== 'marquee' && (
              <Rect
                x={toolPreview.x}
                y={toolPreview.y}
                width={toolPreview.width}
                height={toolPreview.height}
                fill={brushColor}
                opacity={0.5}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={1 / zoom}
                dash={dash}
              />
            )}
            {toolPreview?.kind === 'ellipse' && (
              <Ellipse
                x={toolPreview.x + toolPreview.width / 2}
                y={toolPreview.y + toolPreview.height / 2}
                radiusX={toolPreview.width / 2}
                radiusY={toolPreview.height / 2}
                fill={brushColor}
                opacity={0.5}
                stroke="rgba(255,255,255,0.8)"
                strokeWidth={1 / zoom}
                dash={dash}
              />
            )}
            {toolPreview?.kind === 'line' && (
              <Line
                points={[toolPreview.x1, toolPreview.y1, toolPreview.x2, toolPreview.y2]}
                stroke={brushColor}
                strokeWidth={brushSize}
                lineCap="round"
                opacity={0.7}
              />
            )}
            {toolPreview?.kind === 'gradient' && (
              <Line
                points={[toolPreview.x1, toolPreview.y1, toolPreview.x2, toolPreview.y2]}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={1.5 / zoom}
                dash={dash}
              />
            )}
            {toolPreview?.kind === 'lasso' && activeTool === 'lasso' && (
              <Line
                points={toolPreview.points.flatMap((p) => [p.x, p.y])}
                stroke="rgba(255,255,255,0.9)"
                strokeWidth={1 / zoom}
                dash={dash}
                dashOffset={-marchOffset / zoom}
                closed
              />
            )}

            {/* Active selection */}
            {selection?.kind === 'rect' && (
              <>
                <Rect
                  x={selection.bounds.x}
                  y={selection.bounds.y}
                  width={selection.bounds.width}
                  height={selection.bounds.height}
                  stroke="#000000"
                  strokeWidth={1 / zoom}
                  dash={dash}
                  dashOffset={-marchOffset / zoom}
                />
                <Rect
                  x={selection.bounds.x}
                  y={selection.bounds.y}
                  width={selection.bounds.width}
                  height={selection.bounds.height}
                  stroke="#ffffff"
                  strokeWidth={1 / zoom}
                  dash={dash}
                  dashOffset={(-marchOffset + dash[0]) / zoom}
                />
              </>
            )}
            {selection?.kind === 'lasso' && (
              <>
                <Line
                  points={selection.points.flatMap((p) => [p.x, p.y])}
                  stroke="#000000"
                  strokeWidth={1 / zoom}
                  dash={dash}
                  dashOffset={-marchOffset / zoom}
                  closed
                />
                <Line
                  points={selection.points.flatMap((p) => [p.x, p.y])}
                  stroke="#ffffff"
                  strokeWidth={1 / zoom}
                  dash={dash}
                  dashOffset={(-marchOffset + dash[0]) / zoom}
                  closed
                />
              </>
            )}
            {selection?.kind === 'mask' &&
              selection.contours?.map((loop, i) => (
                <Fragment key={i}>
                  <Line
                    points={loop.flatMap((p) => [p.x, p.y])}
                    stroke="#000000"
                    strokeWidth={1 / zoom}
                    dash={dash}
                    dashOffset={-marchOffset / zoom}
                    closed
                  />
                  <Line
                    points={loop.flatMap((p) => [p.x, p.y])}
                    stroke="#ffffff"
                    strokeWidth={1 / zoom}
                    dash={dash}
                    dashOffset={(-marchOffset + dash[0]) / zoom}
                    closed
                  />
                </Fragment>
              ))}

            {/* Crop overlay */}
            {cropRect && (
              <>
                <Rect x={0} y={0} width={width} height={cropRect.y} fill="rgba(0,0,0,0.6)" />
                <Rect
                  x={0}
                  y={cropRect.y + cropRect.height}
                  width={width}
                  height={Math.max(0, height - cropRect.y - cropRect.height)}
                  fill="rgba(0,0,0,0.6)"
                />
                <Rect x={0} y={cropRect.y} width={cropRect.x} height={cropRect.height} fill="rgba(0,0,0,0.6)" />
                <Rect
                  x={cropRect.x + cropRect.width}
                  y={cropRect.y}
                  width={Math.max(0, width - cropRect.x - cropRect.width)}
                  height={cropRect.height}
                  fill="rgba(0,0,0,0.6)"
                />
                <Rect
                  x={cropRect.x}
                  y={cropRect.y}
                  width={cropRect.width}
                  height={cropRect.height}
                  stroke="#7c5cff"
                  strokeWidth={1.5 / zoom}
                  dash={dash}
                  dashOffset={-marchOffset / zoom}
                />
              </>
            )}

            {/* Social preset safe-zone guide */}
            {showSafeZone && activePreset && (
              <Rect
                x={width * activePreset.safeZoneInset}
                y={height * activePreset.safeZoneInset}
                width={width * (1 - activePreset.safeZoneInset * 2)}
                height={height * (1 - activePreset.safeZoneInset * 2)}
                stroke="#22cc88"
                strokeWidth={1.5 / zoom}
                dash={[6 / zoom, 4 / zoom]}
                listening={false}
              />
            )}
          </KonvaLayer>
        </Stage>
      )}

      {/* Inline text editor */}
      {textEditor && textScreen && (
        <textarea
          ref={(el) => {
            if (!el) return;
            // Defer focus so it wins against Konva's pointer-driven focus on the stage container.
            requestAnimationFrame(() => el.focus());
          }}
          value={textEditor.value}
          onChange={(e) => updateTextEditorValue(e.target.value)}
          onBlur={() => commitTextEditor()}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancelTextEditor();
            }
            e.stopPropagation();
          }}
          spellCheck={false}
          style={{
            position: 'absolute',
            left: textScreen.x,
            top: textScreen.y,
            transform: `translateX(${textTranslate})`,
            font: `${fontSize * zoom}px ${fontFamily}`,
            lineHeight: 1.2,
            color: brushColor,
            textAlign: TEXT_ALIGN_TO_CSS[textAlign],
            background: 'rgba(124,92,255,0.08)',
            border: '1px dashed #7c5cff',
            outline: 'none',
            padding: 0,
            minWidth: 160,
            minHeight: fontSize * zoom * 1.2,
            resize: 'both',
            overflow: 'hidden',
          }}
        />
      )}

      {/* Crop apply/cancel toolbar */}
      {cropRect && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-md bg-[#1f1f23] border border-black/40 px-3 py-1.5 shadow-xl text-sm">
          <span className="mono text-zinc-400">
            {Math.round(cropRect.width)} × {Math.round(cropRect.height)} px
          </span>
          <button
            type="button"
            onClick={() => applyCrop()}
            className="rounded bg-[#7c5cff] px-2.5 py-1 text-white hover:bg-[#6a4ce0] transition-colors"
          >
            Apply Crop
          </button>
          <button
            type="button"
            onClick={() => cancelCrop()}
            className="rounded px-2.5 py-1 text-zinc-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
