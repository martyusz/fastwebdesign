import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import type { BlendMode } from '../engine/types';
import { useEditorStore } from '../store/editorStore';
import { useHistoryStore } from '../store/historyStore';
import { Icon, ICONS } from './icons';

const BLEND_MODES: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten'];

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-black/40">
      <h3 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <div className="px-3 pb-3">{children}</div>
    </section>
  );
}

function PropertiesPanel() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const brushSize = useEditorStore((s) => s.brushSize);
  const brushHardness = useEditorStore((s) => s.brushHardness);
  const brushColor = useEditorStore((s) => s.brushColor);
  const setBrushSize = useEditorStore((s) => s.setBrushSize);
  const setBrushHardness = useEditorStore((s) => s.setBrushHardness);
  const setBrushColor = useEditorStore((s) => s.setBrushColor);

  const showBrushProps = ['brush', 'eraser', 'pencil'].includes(activeTool);

  if (!showBrushProps) {
    return <p className="text-xs text-zinc-500">No options for the selected tool yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        <span className="flex justify-between">
          Size
          <span className="mono text-zinc-300">{brushSize}px</span>
        </span>
        <input
          type="range"
          min={1}
          max={300}
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          className="accent-[#7c5cff]"
        />
      </label>

      {activeTool !== 'pencil' && (
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          <span className="flex justify-between">
            Hardness
            <span className="mono text-zinc-300">{brushHardness}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={brushHardness}
            onChange={(e) => setBrushHardness(Number(e.target.value))}
            className="accent-[#7c5cff]"
          />
        </label>
      )}

      {activeTool !== 'eraser' && (
        <label className="flex items-center justify-between text-xs text-zinc-400">
          Color
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
            className="h-7 w-12 cursor-pointer rounded border border-black/40 bg-transparent p-0.5"
          />
        </label>
      )}
    </div>
  );
}

function LayerPropertiesPanel() {
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const renameLayer = useEditorStore((s) => s.renameLayer);
  const setLayerOpacity = useEditorStore((s) => s.setLayerOpacity);
  const setLayerBlendMode = useEditorStore((s) => s.setLayerBlendMode);

  const layer = layers.find((l) => l.id === activeLayerId);
  if (!layer) return null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        <span>Name</span>
        <input
          type="text"
          value={layer.name}
          onChange={(e) => renameLayer(layer.id, e.target.value)}
          className="rounded border border-black/40 bg-black/30 px-2 py-1 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#7c5cff]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        <span className="flex justify-between">
          Opacity
          <span className="mono text-zinc-300">{Math.round(layer.opacity * 100)}%</span>
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(layer.opacity * 100)}
          onChange={(e) => setLayerOpacity(layer.id, Number(e.target.value) / 100)}
          className="accent-[#7c5cff]"
        />
      </label>

      <label className="flex flex-col gap-1 text-xs text-zinc-400">
        <span>Blend Mode</span>
        <select
          value={layer.blendMode}
          onChange={(e) => setLayerBlendMode(layer.id, e.target.value as BlendMode)}
          className="rounded border border-black/40 bg-black/30 px-2 py-1 text-zinc-200 capitalize focus:outline-none focus:ring-1 focus:ring-[#7c5cff]"
        >
          {BLEND_MODES.map((mode) => (
            <option key={mode} value={mode} className="capitalize">
              {mode}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CanvasThumbnail({
  canvas,
  refreshKey,
}: {
  canvas: HTMLCanvasElement;
  refreshKey: number;
}) {
  const url = useMemo(() => canvas.toDataURL(), [canvas, refreshKey]);
  return <img src={url} alt="" className="h-full w-full object-contain" />;
}

function LayersPanel() {
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const activeEditTarget = useEditorStore((s) => s.activeEditTarget);
  const redrawTick = useEditorStore((s) => s.redrawTick);
  const selectLayer = useEditorStore((s) => s.selectLayer);
  const setActiveEditTarget = useEditorStore((s) => s.setActiveEditTarget);
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility);
  const toggleLayerLock = useEditorStore((s) => s.toggleLayerLock);
  const renameLayer = useEditorStore((s) => s.renameLayer);
  const addLayer = useEditorStore((s) => s.addLayer);
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer);
  const deleteLayer = useEditorStore((s) => s.deleteLayer);
  const reorderLayer = useEditorStore((s) => s.reorderLayer);
  const addLayerMask = useEditorStore((s) => s.addLayerMask);
  const removeLayerMask = useEditorStore((s) => s.removeLayerMask);

  const pastLength = useHistoryStore((s) => s.past.length);
  const futureLength = useHistoryStore((s) => s.future.length);
  const refreshKey = pastLength + futureLength + redrawTick;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dragDisplayIndex, setDragDisplayIndex] = useState<number | null>(null);
  const [dragOverDisplayIndex, setDragOverDisplayIndex] = useState<number | null>(null);

  const activeLayer = layers.find((l) => l.id === activeLayerId);
  const displayLayers = [...layers].reverse();

  function startRename(layerId: string, currentName: string) {
    setEditingId(layerId);
    setEditingName(currentName);
  }

  function commitRename(layerId: string) {
    const name = editingName.trim();
    if (name) renameLayer(layerId, name);
    setEditingId(null);
  }

  function handleDrop(displayIndex: number) {
    if (dragDisplayIndex === null) return;
    const fromIndex = layers.length - 1 - dragDisplayIndex;
    const toIndex = layers.length - 1 - displayIndex;
    reorderLayer(fromIndex, toIndex);
    setDragDisplayIndex(null);
    setDragOverDisplayIndex(null);
  }

  return (
    <div className="flex flex-col gap-1">
      {displayLayers.map((layer, displayIndex) => {
        const isActive = layer.id === activeLayerId;
        const isEditing = editingId === layer.id;
        const isDragging = dragDisplayIndex === displayIndex;
        const isDragOver = dragOverDisplayIndex === displayIndex && dragDisplayIndex !== displayIndex;

        return (
          <div
            key={layer.id}
            draggable={!isEditing}
            onDragStart={() => setDragDisplayIndex(displayIndex)}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverDisplayIndex(displayIndex);
            }}
            onDragLeave={() => {
              setDragOverDisplayIndex((current) => (current === displayIndex ? null : current));
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(displayIndex);
            }}
            onDragEnd={() => {
              setDragDisplayIndex(null);
              setDragOverDisplayIndex(null);
            }}
            className={`flex items-center gap-1.5 rounded-md px-1.5 py-1.5 text-sm transition-colors ${
              isActive ? 'bg-[#7c5cff]/15 ring-1 ring-[#7c5cff]/50' : 'hover:bg-white/5'
            } ${isDragging ? 'opacity-40' : ''} ${isDragOver ? 'ring-1 ring-[#7c5cff] ring-dashed' : ''}`}
          >
            <span className="cursor-grab text-zinc-600 hover:text-zinc-400 active:cursor-grabbing">
              <Icon path={ICONS.grip} />
            </span>

            <button
              type="button"
              title={layer.visible ? 'Hide layer' : 'Show layer'}
              onClick={() => toggleLayerVisibility(layer.id)}
              className="text-zinc-400 hover:text-white"
            >
              <Icon path={layer.visible ? ICONS.eye : ICONS.eyeOff} />
            </button>

            <button
              type="button"
              title="Layer pixels"
              onClick={() => selectLayer(layer.id)}
              className={`h-9 w-12 shrink-0 overflow-hidden rounded border bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-[length:8px_8px] ${
                isActive && activeEditTarget === 'pixels'
                  ? 'border-[#7c5cff]'
                  : 'border-black/40'
              }`}
            >
              <CanvasThumbnail canvas={layer.canvas} refreshKey={refreshKey} />
            </button>

            {layer.mask && (
              <button
                type="button"
                title="Layer mask"
                onClick={() => {
                  selectLayer(layer.id);
                  setActiveEditTarget('mask');
                }}
                className={`h-9 w-9 shrink-0 overflow-hidden rounded border bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-[length:8px_8px] ${
                  isActive && activeEditTarget === 'mask'
                    ? 'border-[#7c5cff]'
                    : 'border-black/40'
                }`}
              >
                <CanvasThumbnail canvas={layer.mask} refreshKey={refreshKey} />
              </button>
            )}

            {isEditing ? (
              <input
                autoFocus
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => commitRename(layer.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename(layer.id);
                  else if (e.key === 'Escape') setEditingId(null);
                }}
                className="flex-1 min-w-0 rounded border border-[#7c5cff]/50 bg-black/30 px-1 py-0.5 text-zinc-200 focus:outline-none"
              />
            ) : (
              <span
                className="flex-1 min-w-0 truncate text-zinc-200"
                onDoubleClick={() => startRename(layer.id, layer.name)}
                title={layer.name}
              >
                {layer.name}
              </span>
            )}

            <button
              type="button"
              title={layer.locked ? 'Unlock layer' : 'Lock layer'}
              onClick={() => toggleLayerLock(layer.id)}
              className={`shrink-0 ${layer.locked ? 'text-zinc-300' : 'text-zinc-600 hover:text-zinc-300'}`}
            >
              <Icon path={layer.locked ? ICONS.lock : ICONS.unlock} />
            </button>
          </div>
        );
      })}

      <div className="mt-2 flex items-center gap-1 text-zinc-500">
        <button
          type="button"
          title="Add layer"
          onClick={() => addLayer()}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 hover:text-white"
        >
          <Icon path={ICONS.plus} />
        </button>
        <button
          type="button"
          title="Duplicate layer"
          onClick={() => activeLayer && duplicateLayer(activeLayer.id)}
          disabled={!activeLayer}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <Icon path={ICONS.duplicate} />
        </button>
        <button
          type="button"
          title="Delete layer"
          onClick={() => activeLayer && deleteLayer(activeLayer.id)}
          disabled={!activeLayer || layers.length <= 1}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 hover:text-white disabled:opacity-30"
        >
          <Icon path={ICONS.trash} />
        </button>
        <button
          type="button"
          title={activeLayer?.mask ? 'Remove layer mask' : 'Add layer mask'}
          onClick={() =>
            activeLayer &&
            (activeLayer.mask ? removeLayerMask(activeLayer.id) : addLayerMask(activeLayer.id))
          }
          disabled={!activeLayer}
          className={`flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 disabled:opacity-30 ${
            activeLayer?.mask ? 'text-[#7c5cff]' : 'hover:text-white'
          }`}
        >
          <Icon path={ICONS.mask} />
        </button>
      </div>
    </div>
  );
}

function HistoryPanel() {
  const past = useHistoryStore((s) => s.past);
  const future = useHistoryStore((s) => s.future);

  if (past.length === 0 && future.length === 0) {
    return <p className="text-xs text-zinc-500">No history yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-0.5 text-sm">
      <li className="rounded px-2 py-1 text-zinc-500">Open document</li>
      {past.map((command, i) => (
        <li key={i} className="rounded bg-[#7c5cff]/10 px-2 py-1 text-zinc-200">
          {command.label}
        </li>
      ))}
      {future
        .slice()
        .reverse()
        .map((command, i) => (
          <li key={i} className="rounded px-2 py-1 text-zinc-500">
            {command.label}
          </li>
        ))}
    </ul>
  );
}

export function RightPanel() {
  return (
    <aside className="w-64 shrink-0 overflow-y-auto bg-[#18181b] border-l border-black/40 flex flex-col">
      <PanelSection title="Properties">
        <PropertiesPanel />
      </PanelSection>
      <PanelSection title="Layer">
        <LayerPropertiesPanel />
      </PanelSection>
      <PanelSection title="Layers">
        <LayersPanel />
      </PanelSection>
      <PanelSection title="History">
        <HistoryPanel />
      </PanelSection>
    </aside>
  );
}
