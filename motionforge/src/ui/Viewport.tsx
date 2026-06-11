import { useEffect, useRef, useState } from 'react';
import { renderComposition } from '../engine/renderer';
import { useRenderLoop } from '../engine/useRenderLoop';
import { useCompStore } from '../store/compStore';

const PADDING = 48;

export function Viewport() {
  const width = useCompStore((s) => s.width);
  const height = useCompStore((s) => s.height);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitScale = Math.min(
    (containerSize.width - PADDING * 2) / width,
    (containerSize.height - PADDING * 2) / height,
    1,
  );
  const scale = Number.isFinite(fitScale) && fitScale > 0 ? fitScale : 1;

  useRenderLoop(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { layers } = useCompStore.getState();
    renderComposition(ctx, { width, height, fps: 0, durationFrames: 0 }, layers);
  });

  return (
    <div
      ref={containerRef}
      className="relative flex flex-1 min-w-0 items-center justify-center overflow-hidden bg-[#0a0a0c]"
      style={{
        backgroundImage:
          'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        className="relative shadow-[0_10px_40px_rgba(0,0,0,0.6)]"
        style={{
          width: width * scale,
          height: height * scale,
          backgroundImage:
            'repeating-conic-gradient(#27272a 0% 25%, #18181b 0% 50%)',
          backgroundSize: '20px 20px',
        }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
