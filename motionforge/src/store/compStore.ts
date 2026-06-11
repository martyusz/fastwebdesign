import { create } from 'zustand';
import { createSolidLayer } from '../layers/factory';
import type { Layer, SolidLayer, Transform } from '../engine/types';

interface CompState {
  width: number;
  height: number;
  fps: number;
  durationFrames: number;

  layers: Layer[];
  selectedLayerId: string | null;
  selectLayer: (id: string | null) => void;
  updateLayerTransform: (id: string, transform: Partial<Transform>) => void;
  updateSolidLayer: (id: string, props: Partial<Pick<SolidLayer, 'color' | 'name'>>) => void;

  currentFrame: number;
  isPlaying: boolean;
  loop: boolean;

  setCurrentFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stop: () => void;
  setLoop: (loop: boolean) => void;
  goToStart: () => void;
  goToEnd: () => void;
}

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const DURATION_FRAMES = FPS * 5; // 5 second composition

export const useCompStore = create<CompState>((set, get) => {
  const background = createSolidLayer(WIDTH, HEIGHT, '#22d3ee', 'Background');
  background.width = WIDTH;
  background.height = HEIGHT;

  return {
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    durationFrames: DURATION_FRAMES,

    layers: [background],
    selectedLayerId: background.id,
    selectLayer: (id) => set({ selectedLayerId: id }),
    updateLayerTransform: (id, transform) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === id ? { ...layer, transform: { ...layer.transform, ...transform } } : layer,
        ),
      })),
    updateSolidLayer: (id, props) =>
      set((state) => ({
        layers: state.layers.map((layer) =>
          layer.id === id && layer.type === 'solid' ? { ...layer, ...props } : layer,
        ),
      })),

    currentFrame: 0,
    isPlaying: false,
    loop: true,

    setCurrentFrame: (frame) => {
      const max = get().durationFrames - 1;
      const clamped = Math.min(max, Math.max(0, Math.round(frame)));
      set({ currentFrame: clamped });
    },
    play: () => set({ isPlaying: true }),
    pause: () => set({ isPlaying: false }),
    togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),
    stop: () => set({ isPlaying: false, currentFrame: 0 }),
    setLoop: (loop) => set({ loop }),
    goToStart: () => set({ currentFrame: 0 }),
    goToEnd: () => set({ currentFrame: get().durationFrames - 1 }),
  };
});
