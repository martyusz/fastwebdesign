import type { ReactNode } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useHistoryStore } from '../store/historyStore';
import { Icon, ICONS } from './icons';

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

function LayersPanel() {
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const toggleLayerVisibility = useEditorStore((s) => s.toggleLayerVisibility);

  return (
    <div className="flex flex-col gap-1">
      {[...layers].reverse().map((layer) => {
        const isActive = layer.id === activeLayerId;
        return (
          <div
            key={layer.id}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
              isActive ? 'bg-[#7c5cff]/15 ring-1 ring-[#7c5cff]/50' : 'hover:bg-white/5'
            }`}
          >
            <button
              type="button"
              title={layer.visible ? 'Hide layer' : 'Show layer'}
              onClick={() => toggleLayerVisibility(layer.id)}
              className="text-zinc-400 hover:text-white"
            >
              <Icon path={layer.visible ? ICONS.eye : ICONS.eyeOff} />
            </button>
            <div className="h-9 w-12 shrink-0 overflow-hidden rounded border border-black/40 bg-[repeating-conic-gradient(#3f3f46_0%_25%,#27272a_0%_50%)] bg-[length:8px_8px]">
              <CanvasThumbnail canvas={layer.canvas} />
            </div>
            <span className="flex-1 truncate text-zinc-200">{layer.name}</span>
            {layer.locked && <Icon path={ICONS.lock} className="text-zinc-500" />}
          </div>
        );
      })}

      <div className="mt-2 flex items-center gap-1 text-zinc-500">
        <button
          type="button"
          title="Add layer (coming in Phase 2)"
          disabled
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 disabled:opacity-30"
        >
          <Icon path={ICONS.plus} />
        </button>
        <button
          type="button"
          title="Duplicate layer (coming in Phase 2)"
          disabled
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 disabled:opacity-30"
        >
          <Icon path={ICONS.duplicate} />
        </button>
        <button
          type="button"
          title="Delete layer (coming in Phase 2)"
          disabled
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/5 disabled:opacity-30"
        >
          <Icon path={ICONS.trash} />
        </button>
      </div>
    </div>
  );
}

function CanvasThumbnail({ canvas }: { canvas: HTMLCanvasElement }) {
  const url = canvas.toDataURL();
  return <img src={url} alt="" className="h-full w-full object-contain" />;
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
      <PanelSection title="Layers">
        <LayersPanel />
      </PanelSection>
      <PanelSection title="History">
        <HistoryPanel />
      </PanelSection>
    </aside>
  );
}
