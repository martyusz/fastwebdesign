import { useEffect, useRef } from 'react';
import { useCompStore } from '../store/compStore';

/**
 * Drives the playhead forward at the composition's frame rate while playing,
 * and invokes `onFrame` every animation frame so the viewport can redraw.
 */
export function useRenderLoop(onFrame: () => void): void {
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  useEffect(() => {
    let rafId: number;
    let lastTime: number | null = null;

    const tick = (time: number) => {
      const { isPlaying, fps, durationFrames, loop, currentFrame, setCurrentFrame, pause } =
        useCompStore.getState();

      if (isPlaying) {
        if (lastTime === null) lastTime = time;
        const elapsed = (time - lastTime) / 1000;
        const framesToAdvance = elapsed * fps;

        if (framesToAdvance >= 1) {
          lastTime = time;
          let next = currentFrame + Math.floor(framesToAdvance);
          if (next >= durationFrames) {
            if (loop) next = next % durationFrames;
            else {
              next = durationFrames - 1;
              pause();
            }
          }
          setCurrentFrame(next);
        }
      } else {
        lastTime = null;
      }

      onFrameRef.current();
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);
}
