import { useEditorStore } from '../store/editorStore';
import { drawingTools, TOOL_DEFINITIONS } from '../tools';
import { ToolIcon } from './icons';

export function LeftToolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);

  let lastGroup = TOOL_DEFINITIONS[0]?.group;

  return (
    <aside className="w-12 shrink-0 bg-[#18181b] border-r border-black/40 flex flex-col items-center py-2 gap-1 overflow-y-auto">
      {TOOL_DEFINITIONS.map((tool) => {
        const showDivider = tool.group !== lastGroup;
        lastGroup = tool.group;
        const isActive = activeTool === tool.name;
        const isImplemented = Boolean(drawingTools[tool.name]) || tool.name === 'move' || tool.name === 'hand' || tool.name === 'zoom';

        return (
          <div key={tool.name} className="contents">
            {showDivider && <div className="w-7 h-px bg-white/10 my-1" />}
            <button
              type="button"
              title={`${tool.label} (${tool.shortcut})`}
              onClick={() => setActiveTool(tool.name)}
              className={`relative w-9 h-9 flex items-center justify-center rounded-md transition-colors group
                ${isActive ? 'bg-[#7c5cff] text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}
                ${!isImplemented ? 'opacity-40' : ''}
              `}
            >
              <ToolIcon name={tool.name} />
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded bg-[#1f1f23] border border-black/40 px-2 py-1 text-xs text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-lg">
                {tool.label} <span className="mono text-zinc-500">({tool.shortcut})</span>
              </span>
            </button>
          </div>
        );
      })}
    </aside>
  );
}
