import { useEffect, useRef, useState } from 'react';
import { useCompStore } from '../store/compStore';
import { Icon, ICONS } from './icons';

function formatTime(frame: number, fps: number): string {
  const totalSeconds = frame / fps;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const frames = frame % fps;
  return `${minutes.toString().padStart(2, '0')}:${seconds
    .toString()
    .padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
}

export function Timeline() {
  const currentFrame = useCompStore((s) => s.currentFrame);
  const durationFrames = useCompStore((s) => s.durationFrames);
  const fps = useCompStore((s) => s.fps);
  const isPlaying = useCompStore((s) => s.isPlaying);
  const loop = useCompStore((s) => s.loop);
  const togglePlay = useCompStore((s) => s.togglePlay);
  const stop = useCompStore((s) => s.stop);
  const setLoop = useCompStore((s) => s.setLoop);
  const setCurrentFrame = useCompStore((s) => s.setCurrentFrame);
  const goToStart = useCompStore((s) => s.goToStart);
  const goToEnd = useCompStore((s) => s.goToEnd);

  const rulerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  function frameFromClientX(clientX: number): number {
    const el = rulerRef.current;
    if (!el) return currentFrame;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    return Math.round(ratio * (durationFrames - 1));
  }

  useEffect(() => {
    if (!isScrubbing) return;
    function onMove(e: MouseEvent) {
      setCurrentFrame(frameFromClientX(e.clientX));
    }
    function onUp() {
      setIsScrubbing(false);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrubbing, durationFrames]);

  // Spacebar play/pause shortcut.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code !== 'Space') return;
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      e.preventDefault();
      togglePlay();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [togglePlay]);

  const playheadPercent = (currentFrame / Math.max(1, durationFrames - 1)) * 100;

  return (
    <footer className="h-40 shrink-0 flex flex-col bg-[#161618] border-t border-black/40">
      <div className="flex items-center gap-2 border-b border-black/40 px-3 py-2">
        <button
          type="button"
          title="Go to start"
          onClick={goToStart}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <Icon path={ICONS.skipStart} />
        </button>
        <button
          type="button"
          title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          onClick={togglePlay}
          className="flex h-8 w-8 items-center justify-center rounded-md bg-[#22d3ee] text-[#0a0a0c] hover:bg-[#67e8f9]"
        >
          <Icon path={isPlaying ? ICONS.pause : ICONS.play} />
        </button>
        <button
          type="button"
          title="Stop"
          onClick={stop}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <Icon path={ICONS.stop} />
        </button>
        <button
          type="button"
          title="Go to end"
          onClick={goToEnd}
          className="flex h-7 w-7 items-center justify-center rounded text-zinc-400 hover:bg-white/5 hover:text-white"
        >
          <Icon path={ICONS.skipEnd} />
        </button>
        <button
          type="button"
          title="Loop playback"
          onClick={() => setLoop(!loop)}
          className={`flex h-7 w-7 items-center justify-center rounded ${
            loop ? 'text-[#22d3ee]' : 'text-zinc-500 hover:text-white'
          } hover:bg-white/5`}
        >
          <Icon path={ICONS.loop} />
        </button>

        <div className="ml-2 mono text-xs text-zinc-300">
          {formatTime(currentFrame, fps)}{' '}
          <span className="text-zinc-600">/ {formatTime(durationFrames - 1, fps)}</span>
        </div>
        <div className="mono text-xs text-zinc-600">
          frame {currentFrame} / {durationFrames - 1}
        </div>
      </div>

      <div className="flex-1 px-3 py-3">
        <div
          ref={rulerRef}
          onMouseDown={(e) => {
            setIsScrubbing(true);
            setCurrentFrame(frameFromClientX(e.clientX));
          }}
          className="relative h-full w-full cursor-pointer rounded-md bg-black/30 border border-black/40"
        >
          {/* Second markers */}
          {Array.from({ length: Math.floor(durationFrames / fps) + 1 }).map((_, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-white/10"
              style={{ left: `${((i * fps) / Math.max(1, durationFrames - 1)) * 100}%` }}
            >
              <span className="absolute top-1 left-1 mono text-[10px] text-zinc-600">{i}s</span>
            </div>
          ))}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[#22d3ee]"
            style={{ left: `${playheadPercent}%` }}
          >
            <div className="absolute -top-1 -left-[5px] h-3 w-[11px] rounded-sm bg-[#22d3ee]" />
          </div>
        </div>
      </div>
    </footer>
  );
}
