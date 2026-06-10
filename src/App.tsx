import { useEffect } from 'react';
import { CanvasArea } from './ui/CanvasArea';
import { LeftToolbar } from './ui/LeftToolbar';
import { RightPanel } from './ui/RightPanel';
import { StatusBar } from './ui/StatusBar';
import { TopMenuBar } from './ui/TopMenuBar';
import { useEditorStore } from './store/editorStore';
import { useHistoryStore } from './store/historyStore';
import { TOOL_DEFINITIONS } from './tools';
import type { ToolName } from './engine/types';

const SHORTCUT_TO_TOOL: Record<string, ToolName> = Object.fromEntries(
  TOOL_DEFINITIONS.map((tool) => [tool.shortcut.toLowerCase(), tool.name]),
);

function App() {
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const undo = useHistoryStore((s) => s.undo);
  const redo = useHistoryStore((s) => s.redo);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

      const key = e.key.toLowerCase();

      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const tool = SHORTCUT_TO_TOOL[key];
      if (tool) {
        e.preventDefault();
        setActiveTool(tool);
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setActiveTool, undo, redo]);

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#0d0d0f] text-zinc-100">
      <TopMenuBar />
      <div className="flex flex-1 min-h-0">
        <LeftToolbar />
        <CanvasArea />
        <RightPanel />
      </div>
      <StatusBar />
    </div>
  );
}

export default App;
