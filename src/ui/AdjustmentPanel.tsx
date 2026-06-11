import { useMemo, useRef, useState } from 'react';
import { buildCurveLUT, computeHistogram } from '../engine/adjustments';
import { compositeLayersBelow } from '../engine/layer';
import type {
  BrightnessContrastSettings,
  ColorBalanceSettings,
  CurvePoint,
  CurvesSettings,
  ExposureSettings,
  HueSaturationSettings,
  LevelsSettings,
  VibranceSettings,
} from '../engine/types';
import { useEditorStore } from '../store/editorStore';

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      <span className="flex justify-between">
        {label}
        <span className="mono text-zinc-300">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-[#7c5cff]"
      />
    </label>
  );
}

/** Renders a normalized 0-255 histogram as filled bars in a 256x100 viewBox. */
function HistogramBars({ data, color, opacity = 1 }: { data: number[]; color: string; opacity?: number }) {
  const max = Math.max(1, ...data);
  let path = '';
  for (let i = 0; i < 256; i++) {
    const h = (data[i] / max) * 100;
    if (h <= 0) continue;
    path += `M${i},100 L${i},${100 - h} `;
  }
  return <path d={path} stroke={color} strokeWidth={1} opacity={opacity} />;
}

function Histogram({ histogram, channel }: { histogram: ReturnType<typeof computeHistogram>; channel: 'rgb' | 'r' | 'g' | 'b' }) {
  return (
    <svg viewBox="0 0 256 100" preserveAspectRatio="none" className="h-16 w-full rounded border border-black/40 bg-black/30">
      {channel === 'rgb' ? (
        <>
          <HistogramBars data={histogram.r} color="#ff5c5c" opacity={0.6} />
          <HistogramBars data={histogram.g} color="#5cff7c" opacity={0.6} />
          <HistogramBars data={histogram.b} color="#5c9bff" opacity={0.6} />
        </>
      ) : channel === 'r' ? (
        <HistogramBars data={histogram.r} color="#ff5c5c" />
      ) : channel === 'g' ? (
        <HistogramBars data={histogram.g} color="#5cff7c" />
      ) : (
        <HistogramBars data={histogram.b} color="#5c9bff" />
      )}
    </svg>
  );
}

const CURVE_CHANNELS: { id: 'rgb' | 'r' | 'g' | 'b'; label: string; color: string }[] = [
  { id: 'rgb', label: 'RGB', color: '#ffffff' },
  { id: 'r', label: 'R', color: '#ff5c5c' },
  { id: 'g', label: 'G', color: '#5cff7c' },
  { id: 'b', label: 'B', color: '#5c9bff' },
];

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v;
}

function CurvesEditor({
  settings,
  histogram,
  onChange,
}: {
  settings: CurvesSettings;
  histogram: ReturnType<typeof computeHistogram>;
  onChange: (channel: 'rgb' | 'r' | 'g' | 'b', points: CurvePoint[]) => void;
}) {
  const [channel, setChannel] = useState<'rgb' | 'r' | 'g' | 'b'>('rgb');
  const svgRef = useRef<SVGSVGElement>(null);
  const dragIndex = useRef<number | null>(null);

  const points = settings[channel];
  const lut = buildCurveLUT(points);
  let pathD = '';
  for (let x = 0; x < 256; x++) {
    pathD += `${x === 0 ? 'M' : 'L'}${x},${255 - lut[x]} `;
  }

  function pointFromEvent(e: React.PointerEvent<SVGSVGElement>): CurvePoint {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 255;
    const y = 255 - ((e.clientY - rect.top) / rect.height) * 255;
    return { x: clamp(Math.round(x), 0, 255), y: clamp(Math.round(y), 0, 255) };
  }

  function nearestPointIndex(p: CurvePoint): { index: number; dist: number } {
    let index = -1;
    let dist = Infinity;
    points.forEach((pt, i) => {
      const d = Math.hypot(pt.x - p.x, pt.y - p.y);
      if (d < dist) {
        dist = d;
        index = i;
      }
    });
    return { index, dist };
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const p = pointFromEvent(e);
    const { index, dist } = nearestPointIndex(p);
    if (dist < 14) {
      dragIndex.current = index;
    } else {
      const newPoints = [...points, p];
      dragIndex.current = newPoints.length - 1;
      onChange(channel, newPoints);
    }
    svgRef.current?.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (dragIndex.current === null) return;
    const p = pointFromEvent(e);
    const newPoints = points.map((pt, i) => (i === dragIndex.current ? p : pt));
    onChange(channel, newPoints);
  }

  function handlePointerUp() {
    if (dragIndex.current === null) return;
    dragIndex.current = null;
    onChange(channel, [...points].sort((a, b) => a.x - b.x));
  }

  function handleDoubleClick(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 255;
    const y = 255 - ((e.clientY - rect.top) / rect.height) * 255;
    const { index, dist } = nearestPointIndex({ x, y });
    if (dist < 14 && points.length > 2) {
      onChange(channel, points.filter((_, i) => i !== index));
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-1">
        {CURVE_CHANNELS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setChannel(c.id)}
            className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
              channel === c.id ? 'bg-[#7c5cff] text-white' : 'bg-black/30 text-zinc-400 hover:text-white'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 255 255"
        className="aspect-square w-full cursor-crosshair touch-none rounded border border-black/40 bg-black/30"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Histogram backdrop */}
        <g opacity={0.5} transform="scale(1, 2.55)">
          {channel === 'rgb' ? (
            <>
              <HistogramBars data={histogram.r} color="#ff5c5c" opacity={0.5} />
              <HistogramBars data={histogram.g} color="#5cff7c" opacity={0.5} />
              <HistogramBars data={histogram.b} color="#5c9bff" opacity={0.5} />
            </>
          ) : (
            <HistogramBars
              data={channel === 'r' ? histogram.r : channel === 'g' ? histogram.g : histogram.b}
              color={CURVE_CHANNELS.find((c) => c.id === channel)!.color}
              opacity={0.6}
            />
          )}
        </g>

        {/* Diagonal reference line */}
        <line x1={0} y1={255} x2={255} y2={0} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="4 4" />

        {/* Curve */}
        <path d={pathD} stroke={CURVE_CHANNELS.find((c) => c.id === channel)!.color} strokeWidth={1.5} fill="none" />

        {/* Control points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={255 - p.y} r={4} fill="#1f1f23" stroke="#ffffff" strokeWidth={1.5} />
        ))}
      </svg>
      <p className="text-[11px] text-zinc-600">Drag points to adjust. Double-click to add or remove a point.</p>
    </div>
  );
}

function LevelsEditor({
  settings,
  histogram,
  onChange,
}: {
  settings: LevelsSettings;
  histogram: ReturnType<typeof computeHistogram>;
  onChange: (settings: Partial<LevelsSettings>) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Histogram histogram={histogram} channel="rgb" />
      <SliderField label="Input Black" value={settings.inputBlack} min={0} max={254} onChange={(v) => onChange({ inputBlack: Math.min(v, settings.inputWhite - 1) })} />
      <SliderField label="Gamma" value={settings.gamma} min={0.1} max={9.99} step={0.01} onChange={(v) => onChange({ gamma: v })} />
      <SliderField label="Input White" value={settings.inputWhite} min={1} max={255} onChange={(v) => onChange({ inputWhite: Math.max(v, settings.inputBlack + 1) })} />
      <div className="border-t border-black/40 pt-2">
        <SliderField label="Output Black" value={settings.outputBlack} min={0} max={254} onChange={(v) => onChange({ outputBlack: Math.min(v, settings.outputWhite - 1) })} />
        <SliderField label="Output White" value={settings.outputWhite} min={1} max={255} onChange={(v) => onChange({ outputWhite: Math.max(v, settings.outputBlack + 1) })} />
      </div>
    </div>
  );
}

export function AdjustmentPanel() {
  const layers = useEditorStore((s) => s.layers);
  const activeLayerId = useEditorStore((s) => s.activeLayerId);
  const width = useEditorStore((s) => s.width);
  const height = useEditorStore((s) => s.height);
  const updateAdjustmentSettings = useEditorStore((s) => s.updateAdjustmentSettings);
  const setAdjustmentClip = useEditorStore((s) => s.setAdjustmentClip);

  const layer = layers.find((l) => l.id === activeLayerId);
  const adjustment = layer?.adjustment;

  const histogram = useMemo(() => {
    if (!layer) return null;
    const input = compositeLayersBelow(layers, layer.id, width, height);
    return computeHistogram(input);
  }, [layers, layer, width, height]);

  if (!layer || !adjustment || !histogram) return null;

  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-xs text-zinc-400">
        <input
          type="checkbox"
          checked={adjustment.clipToBelow}
          onChange={(e) => setAdjustmentClip(layer.id, e.target.checked)}
          className="accent-[#7c5cff]"
        />
        Clip to layer below
      </label>

      {adjustment.type === 'curves' && (
        <CurvesEditor
          settings={adjustment.settings as CurvesSettings}
          histogram={histogram}
          onChange={(channel, points) =>
            updateAdjustmentSettings(layer.id, { [channel]: points } as Partial<CurvesSettings>)
          }
        />
      )}

      {adjustment.type === 'levels' && (
        <LevelsEditor
          settings={adjustment.settings as LevelsSettings}
          histogram={histogram}
          onChange={(patch) => updateAdjustmentSettings(layer.id, patch)}
        />
      )}

      {adjustment.type === 'brightness-contrast' &&
        (() => {
          const s = adjustment.settings as BrightnessContrastSettings;
          return (
            <>
              <SliderField label="Brightness" value={s.brightness} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { brightness: v })} />
              <SliderField label="Contrast" value={s.contrast} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { contrast: v })} />
            </>
          );
        })()}

      {adjustment.type === 'hue-saturation' &&
        (() => {
          const s = adjustment.settings as HueSaturationSettings;
          return (
            <>
              <SliderField label="Hue" value={s.hue} min={-180} max={180} unit="°" onChange={(v) => updateAdjustmentSettings(layer.id, { hue: v })} />
              <SliderField label="Saturation" value={s.saturation} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { saturation: v })} />
              <SliderField label="Lightness" value={s.lightness} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { lightness: v })} />
            </>
          );
        })()}

      {adjustment.type === 'color-balance' &&
        (() => {
          const s = adjustment.settings as ColorBalanceSettings;
          return (
            <>
              <SliderField label="Cyan – Red" value={s.cyanRed} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { cyanRed: v })} />
              <SliderField label="Magenta – Green" value={s.magentaGreen} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { magentaGreen: v })} />
              <SliderField label="Yellow – Blue" value={s.yellowBlue} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { yellowBlue: v })} />
              <label className="flex items-center gap-2 text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={s.preserveLuminosity}
                  onChange={(e) => updateAdjustmentSettings(layer.id, { preserveLuminosity: e.target.checked })}
                  className="accent-[#7c5cff]"
                />
                Preserve Luminosity
              </label>
            </>
          );
        })()}

      {adjustment.type === 'exposure' &&
        (() => {
          const s = adjustment.settings as ExposureSettings;
          return (
            <>
              <SliderField label="Exposure" value={s.exposure} min={-5} max={5} step={0.01} onChange={(v) => updateAdjustmentSettings(layer.id, { exposure: v })} />
              <SliderField label="Offset" value={s.offset} min={-0.5} max={0.5} step={0.001} onChange={(v) => updateAdjustmentSettings(layer.id, { offset: v })} />
              <SliderField label="Gamma" value={s.gamma} min={0.1} max={3} step={0.01} onChange={(v) => updateAdjustmentSettings(layer.id, { gamma: v })} />
            </>
          );
        })()}

      {adjustment.type === 'vibrance' &&
        (() => {
          const s = adjustment.settings as VibranceSettings;
          return (
            <>
              <SliderField label="Vibrance" value={s.vibrance} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { vibrance: v })} />
              <SliderField label="Saturation" value={s.saturation} min={-100} max={100} onChange={(v) => updateAdjustmentSettings(layer.id, { saturation: v })} />
            </>
          );
        })()}
    </div>
  );
}
