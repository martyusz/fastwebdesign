import { useCompStore } from '../store/compStore';

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  suffix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
      <span className="w-20 shrink-0">{label}</span>
      <span className="flex flex-1 items-center gap-1 rounded border border-black/40 bg-black/30 px-2 py-1">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="mono w-full bg-transparent text-zinc-100 outline-none"
        />
        {suffix && <span className="mono text-zinc-500">{suffix}</span>}
      </span>
    </label>
  );
}

export function RightPanel() {
  const layers = useCompStore((s) => s.layers);
  const selectedLayerId = useCompStore((s) => s.selectedLayerId);
  const updateLayerTransform = useCompStore((s) => s.updateLayerTransform);
  const updateSolidLayer = useCompStore((s) => s.updateSolidLayer);

  const layer = layers.find((l) => l.id === selectedLayerId);

  return (
    <aside className="w-72 shrink-0 overflow-y-auto bg-[#161618] border-l border-black/40">
      <div className="border-b border-black/40 px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
          Properties
        </h3>
      </div>

      {!layer ? (
        <p className="px-3 py-3 text-xs text-zinc-500">No layer selected.</p>
      ) : (
        <div className="flex flex-col gap-3 px-3 py-3">
          <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
            <span className="w-20 shrink-0">Name</span>
            <input
              type="text"
              value={layer.name}
              onChange={(e) => updateSolidLayer(layer.id, { name: e.target.value })}
              className="flex-1 rounded border border-black/40 bg-black/30 px-2 py-1 text-zinc-100 outline-none"
            />
          </label>

          {layer.type === 'solid' && (
            <label className="flex items-center justify-between gap-2 text-xs text-zinc-400">
              <span className="w-20 shrink-0">Color</span>
              <input
                type="color"
                value={layer.color}
                onChange={(e) => updateSolidLayer(layer.id, { color: e.target.value })}
                className="h-7 w-12 cursor-pointer rounded border border-black/40 bg-transparent p-0.5"
              />
            </label>
          )}

          <div className="my-1 h-px bg-black/40" />

          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Transform
          </h4>

          <NumberField
            label="Position X"
            value={layer.transform.x}
            onChange={(v) => updateLayerTransform(layer.id, { x: v })}
            suffix="px"
          />
          <NumberField
            label="Position Y"
            value={layer.transform.y}
            onChange={(v) => updateLayerTransform(layer.id, { y: v })}
            suffix="px"
          />
          <NumberField
            label="Scale"
            value={layer.transform.scale}
            onChange={(v) => updateLayerTransform(layer.id, { scale: v })}
            suffix="%"
          />
          <NumberField
            label="Rotation"
            value={layer.transform.rotation}
            onChange={(v) => updateLayerTransform(layer.id, { rotation: v })}
            suffix="°"
          />
          <NumberField
            label="Opacity"
            value={layer.transform.opacity}
            onChange={(v) =>
              updateLayerTransform(layer.id, {
                opacity: Math.min(100, Math.max(0, v)),
              })
            }
            suffix="%"
          />

          <p className="mt-2 text-[11px] text-zinc-600">
            Keyframing for these properties arrives in Phase 3.
          </p>
        </div>
      )}
    </aside>
  );
}
