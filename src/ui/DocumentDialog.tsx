import type { ReactNode } from 'react';
import { useEditorStore } from '../store/editorStore';
import { SOCIAL_PRESETS } from '../presets';

const ANCHOR_LABELS = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];

export function DocumentDialog() {
  const dialog = useEditorStore((s) => s.documentDialog);
  const update = useEditorStore((s) => s.updateDocumentDialog);
  const apply = useEditorStore((s) => s.applyDocumentDialog);
  const cancel = useEditorStore((s) => s.cancelDocumentDialog);

  if (!dialog) return null;

  let title = '';
  let applyLabel = 'Apply';
  let body: ReactNode = null;

  if (dialog.mode === 'new') {
    title = 'New Document';
    applyLabel = 'Create';
    body = (
      <>
        <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
          <span>Preset</span>
          <select
            value={dialog.presetId ?? 'custom'}
            onChange={(e) => {
              const presetId = e.target.value === 'custom' ? null : e.target.value;
              const preset = SOCIAL_PRESETS.find((p) => p.id === presetId);
              update(preset ? { presetId, width: preset.width, height: preset.height } : { presetId: null });
            }}
            className="rounded bg-white/5 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-[#7c5cff]"
          >
            <option value="custom">Custom</option>
            {SOCIAL_PRESETS.map((preset) => (
              <option key={preset.id} value={preset.id}>
                {preset.label} ({preset.width}×{preset.height})
              </option>
            ))}
          </select>
        </label>
        <NumberField
          label="Width"
          value={dialog.width}
          unit="px"
          onChange={(width) => update({ width, presetId: null })}
        />
        <NumberField
          label="Height"
          value={dialog.height}
          unit="px"
          onChange={(height) => update({ height, presetId: null })}
        />
        <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
          <span>Background</span>
          <div className="flex gap-2">
            {(['white', 'transparent'] as const).map((bg) => (
              <button
                key={bg}
                type="button"
                onClick={() => update({ background: bg })}
                className={`flex-1 rounded px-2 py-1.5 text-sm capitalize transition-colors ${
                  dialog.background === bg
                    ? 'bg-[#7c5cff] text-white'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {bg}
              </button>
            ))}
          </div>
        </label>
      </>
    );
  } else if (dialog.mode === 'image-size') {
    title = 'Image Size';
    const ratio = dialog.originalWidth / dialog.originalHeight;
    body = (
      <>
        <NumberField
          label="Width"
          value={dialog.width}
          unit="px"
          onChange={(width) =>
            update(dialog.maintainAspect ? { width, height: Math.round(width / ratio) } : { width })
          }
        />
        <NumberField
          label="Height"
          value={dialog.height}
          unit="px"
          onChange={(height) =>
            update(dialog.maintainAspect ? { height, width: Math.round(height * ratio) } : { height })
          }
        />
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input
            type="checkbox"
            checked={dialog.maintainAspect}
            onChange={(e) => update({ maintainAspect: e.target.checked })}
            className="accent-[#7c5cff]"
          />
          Maintain aspect ratio
        </label>
        <p className="text-[11px] text-zinc-500">Resamples and scales all layer pixel content to the new dimensions.</p>
      </>
    );
  } else if (dialog.mode === 'canvas-size') {
    title = 'Canvas Size';
    body = (
      <>
        <NumberField label="Width" value={dialog.width} unit="px" onChange={(width) => update({ width })} />
        <NumberField label="Height" value={dialog.height} unit="px" onChange={(height) => update({ height })} />
        <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
          <span>Anchor</span>
          <div className="grid grid-cols-3 gap-1 w-fit">
            {ANCHOR_LABELS.map((label, i) => {
              const ax = (i % 3) as 0 | 1 | 2;
              const ay = Math.floor(i / 3) as 0 | 1 | 2;
              const active = dialog.anchorX === ax && dialog.anchorY === ay;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => update({ anchorX: ax, anchorY: ay })}
                  className={`flex h-8 w-8 items-center justify-center rounded text-sm transition-colors ${
                    active ? 'bg-[#7c5cff] text-white' : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </label>
        <p className="text-[11px] text-zinc-500">
          Resizes the canvas without scaling content. New areas are added or cropped relative to the chosen anchor.
        </p>
      </>
    );
  } else if (dialog.mode === 'export') {
    title = 'Export As';
    applyLabel = 'Export';
    body = (
      <>
        <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
          <span>Filename</span>
          <input
            type="text"
            value={dialog.filename}
            onChange={(e) => update({ filename: e.target.value })}
            className="rounded bg-white/5 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-[#7c5cff]"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
          <span>Format</span>
          <div className="flex gap-2">
            {(['png', 'jpeg'] as const).map((format) => (
              <button
                key={format}
                type="button"
                onClick={() => update({ format })}
                className={`flex-1 rounded px-2 py-1.5 text-sm uppercase transition-colors ${
                  dialog.format === format
                    ? 'bg-[#7c5cff] text-white'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {format}
              </button>
            ))}
          </div>
        </label>
        {dialog.format === 'jpeg' && (
          <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
            <span className="flex items-center justify-between">
              Quality
              <span className="mono text-zinc-300">{Math.round(dialog.quality * 100)}%</span>
            </span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.01}
              value={dialog.quality}
              onChange={(e) => update({ quality: Number(e.target.value) })}
              className="accent-[#7c5cff]"
            />
          </label>
        )}
      </>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-[340px] rounded-lg bg-[#1f1f23] border border-black/40 shadow-2xl">
        <div className="px-4 py-3 border-b border-white/5 text-sm font-medium text-zinc-100">{title}</div>
        <div className="px-4 py-3 flex flex-col gap-4">{body}</div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/5">
          <button type="button" onClick={cancel} className="rounded px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={apply} className="rounded bg-[#7c5cff] px-3 py-1.5 text-sm text-white hover:bg-[#6a4ce0] transition-colors">
            {applyLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-xs text-zinc-400">
      <span>{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={value}
          onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))}
          className="w-full rounded bg-white/5 px-2 py-1.5 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-[#7c5cff]"
        />
        {unit && <span className="mono text-zinc-500">{unit}</span>}
      </div>
    </label>
  );
}
