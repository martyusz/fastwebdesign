import { useEditorStore } from '../store/editorStore';
import { TOOL_DEFINITIONS } from '../tools';

export function StatusBar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);

  const toolDef = TOOL_DEFINITIONS.find((t) => t.name === activeTool);
  const activeLayer = layers.find((l) => l.id === activeLayerId);

  return (
    <footer className="h-6 shrink-0 flex items-center justify-between px-3 bg-[#18181b] border-t border-black/40 text-[11px] text-zinc-500">
      <span>
        Tool: <span className="text-zinc-300">{toolDef?.label}</span>
        {toolDef && <span className="mono"> ({toolDef.shortcut})</span>}
      </span>
      <span>
        Layer: <span className="text-zinc-300">{activeLayer?.name}</span>
      </span>
      <span className="mono">PixelForge v0.1 · Phase 3</span>
    </footer>
  );
}
