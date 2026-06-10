import { useCompStore } from '../store/compStore';
import { Icon, ICONS } from './icons';
import { Logo } from './Logo';

export function TopBar() {
  const width = useCompStore((s) => s.width);
  const height = useCompStore((s) => s.height);
  const fps = useCompStore((s) => s.fps);
  const durationFrames = useCompStore((s) => s.durationFrames);

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-3 bg-[#161618] border-b border-black/40 text-sm">
      <Logo />

      <div className="flex items-center gap-4 text-zinc-400">
        <span className="mono text-xs">
          {width} × {height}
        </span>
        <span className="mono text-xs">{fps} fps</span>
        <span className="mono text-xs">{(durationFrames / fps).toFixed(1)}s</span>
      </div>

      <button
        type="button"
        title="Export (coming in Phase 5)"
        disabled
        className="flex items-center gap-1.5 rounded-md border border-[#22d3ee]/30 bg-[#22d3ee]/10 px-3 py-1.5 text-xs font-medium text-[#22d3ee] disabled:opacity-40"
      >
        <Icon path={ICONS.download} />
        Export
      </button>
    </header>
  );
}
