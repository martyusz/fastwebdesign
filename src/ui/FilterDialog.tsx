import { getFilter } from '../filters';
import { useEditorStore } from '../store/editorStore';

export function FilterDialog() {
  const dialog = useEditorStore((s) => s.filterDialog);
  const updateFilterParams = useEditorStore((s) => s.updateFilterParams);
  const applyFilterDialog = useEditorStore((s) => s.applyFilterDialog);
  const cancelFilterDialog = useEditorStore((s) => s.cancelFilterDialog);

  if (!dialog) return null;
  const filter = getFilter(dialog.filterId);
  if (!filter) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[340px] rounded-lg bg-[#1f1f23] border border-black/40 shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 text-sm font-medium text-zinc-100">
          {filter.label}
        </div>
        <div className="px-4 py-3 flex flex-col gap-4">
          {filter.params.map((param) => {
            const value = dialog.params[param.id] ?? param.defaultValue;
            return (
              <label key={param.id} className="flex flex-col gap-1.5 text-xs text-zinc-400">
                <span className="flex items-center justify-between">
                  {param.label}
                  <span className="mono text-zinc-300">
                    {value}
                    {param.unit ?? ''}
                  </span>
                </span>
                <input
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  value={value}
                  onChange={(e) => updateFilterParams({ [param.id]: Number(e.target.value) })}
                  className="accent-[#7c5cff]"
                />
              </label>
            );
          })}
          <p className="text-[11px] text-zinc-500">
            Preview is applied to the canvas live. Apply to keep it, Cancel to revert.
          </p>
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/5">
          <button
            type="button"
            onClick={cancelFilterDialog}
            className="rounded px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={applyFilterDialog}
            className="rounded bg-[#7c5cff] px-3 py-1.5 text-sm text-white hover:bg-[#6a4ce0] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
