import Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage, Layer as KonvaLayer, Rect, Stage } from 'react-konva';
import { cloneLayerImageData, restoreLayerImageData } from '../engine/layer';
import { BLEND_MODE_TO_COMPOSITE } from '../engine/types';
import { useEditorStore } from '../store/editorStore';
import { useHistoryStore } from '../store/historyStore';
import { drawingTools } from '../tools';

const ZOOM_STEP = 1.08;
const MIN_ZOOM = 0.05;
const MAX_ZOOM = 8;

export function CanvasArea() {
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const activeTool = useEditorStore((s) => s.activeTool);
  const brushSize = useEditorStore((s) => s.brushSize);
  const brushHardness = useEditorStore((s) => s.brushHardness);
  const brushColor = useEditorStore((s) => s.brushColor);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const requestRedraw = useEditorStore((s) => s.requestRedraw);

  const push = useHistoryStore((s) => s.push);

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const imageRefs = useRef<Map<string, Konva.Image>>(new Map());
  const beforeSnapshot = useRef<ImageData | null>(null);
  const isPainting = useRef(false);
  const hasCentered = useRef(false);

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [spacePressed, setSpacePressed] = useState(false);

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

  function getRelativePoint(): { x: number; y: number } | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const pos = stage.getRelativePointerPosition();
    return pos ?? null;
  }

  function redrawCanvas() {
    requestRedraw();
    stageRef.current?.batchDraw();
  }

  const isPanning = activeTool === 'hand' || spacePressed;
  const activeDrawingTool = drawingTools[activeTool];

  function handlePointerDown() {
    if (isPanning) return;
    const tool = activeDrawingTool;
    if (!tool) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer || layer.locked || !layer.visible) return;
    const point = getRelativePoint();
    if (!point) return;

    isPainting.current = true;
    beforeSnapshot.current = cloneLayerImageData(layer);
    tool.onPointerDown({ layer, point, brushSize, brushHardness, brushColor });
    redrawCanvas();
  }

  function handlePointerMove() {
    if (!isPainting.current) return;
    const tool = activeDrawingTool;
    if (!tool) return;
    const layer = layers.find((l) => l.id === activeLayerId);
    if (!layer) return;
    const point = getRelativePoint();
    if (!point) return;

    tool.onPointerMove({ layer, point, brushSize, brushHardness, brushColor });
    redrawCanvas();
  }

  function handlePointerUp() {
    if (!isPainting.current) return;
    const tool = activeDrawingTool;
    const layer = layers.find((l) => l.id === activeLayerId);
    isPainting.current = false;

    if (tool && layer) {
      tool.onPointerUp({ layer, point: { x: 0, y: 0 }, brushSize, brushHardness, brushColor });
    }

    if (layer && beforeSnapshot.current) {
      const before = beforeSnapshot.current;
      const after = cloneLayerImageData(layer);
      const layerId = layer.id;

      push({
        label: activeTool === 'eraser' ? 'Erase' : 'Brush Stroke',
        undo: () => {
          const target = useEditorStore.getState().layers.find((l) => l.id === layerId);
          if (!target) return;
          restoreLayerImageData(target, before);
          redrawCanvas();
        },
        redo: () => {
          const target = useEditorStore.getState().layers.find((l) => l.id === layerId);
          if (!target) return;
          restoreLayerImageData(target, after);
          redrawCanvas();
        },
      });
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
  else if (activeDrawingTool) cursor = 'crosshair';
  else if (activeTool === 'zoom') cursor = 'zoom-in';

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
                    image={layer.canvas}
                    x={0}
                    y={0}
                    width={width}
                    height={height}
                    opacity={layer.opacity}
                    globalCompositeOperation={BLEND_MODE_TO_COMPOSITE[layer.blendMode]}
                  />
                ),
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
          </KonvaLayer>
        </Stage>
      )}
    </div>
  );
}
