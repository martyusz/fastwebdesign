import { create } from 'zustand';
import type { Command } from '../engine/history';

interface HistoryState {
  past: Command[];
  future: Command[];
  push: (command: Command) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],

  push: (command) => {
    set((state) => ({ past: [...state.past, command], future: [] }));
  },

  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return;
    const command = past[past.length - 1];
    command.undo();
    set({ past: past.slice(0, -1), future: [command, ...future] });
  },

  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return;
    const command = future[0];
    command.redo();
    set({ past: [...past, command], future: future.slice(1) });
  },

  reset: () => set({ past: [], future: [] }),
}));
