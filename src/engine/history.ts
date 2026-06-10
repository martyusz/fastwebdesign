export interface Command {
  /** Short label shown in the history panel. */
  label: string;
  undo: () => void;
  redo: () => void;
}
