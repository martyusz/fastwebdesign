import { useCompStore } from '../store/compStore';
import { Icon, ICONS } from './icons';

export function LeftPanel() {
  const layers = useCompStore((s) => s.layers);
  const selectedLayerId = useCompStore((s) => s.selectedLayerId);
  const selectLayer = useCompStore((s) => s.selectLayer);

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-[#161618] border-r border-black/40">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/40">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Layers
        </h3>
        <button
          type="button"
          title="Add layer (coming in Phase 2)"
          disabled
          className="flex h-6 w-6 items-center justify-center rounded text-zinc-500 hover:bg-white/5 disabled:opacity-30"
        >
          <Icon path={ICONS.plus} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {[...layers].reverse().map((layer) => {
          const isSelected = layer.id === selectedLayerId;
          return (
            <div
              key={layer.id}
              onClick={() => selectLayer(layer.id)}
              className={`flex items-center gap-2 px-2 py-1.5 mx-1 rounded-md cursor-pointer text-sm ${
                isSelected
                  ? 'bg-[#22d3ee]/15 ring-1 ring-[#22d3ee]/50 text-white'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <button
                type="button"
                title={layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-400 hover:text-white"
              >
                <Icon path={layer.visible ? ICONS.eye : ICONS.eyeOff} />
              </button>
              <span
                className="h-4 w-4 shrink-0 rounded-sm border border-black/40"
                style={{ background: layer.type === 'solid' ? layer.color : '#52525b' }}
              />
              <span className="flex-1 truncate">{layer.name}</span>
              <button
                type="button"
                title={layer.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={(e) => e.stopPropagation()}
                className="text-zinc-500 hover:text-white"
              >
                <Icon path={layer.locked ? ICONS.lock : ICONS.unlock} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 px-2 py-2 border-t border-black/40 text-zinc-500">
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
    </aside>
  );
}
