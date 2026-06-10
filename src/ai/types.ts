/** A single edit operation that the AI assistant can request. */
export interface AIOperation {
  type: 'filter' | 'crop' | 'rotate' | 'resize' | 'adjust';
  /** For type: 'filter' — one of 'grayscale' | 'invert' | 'sepia' | 'blur'. */
  name?: string;
  /** For type: 'adjust' — one of 'brightness' | 'contrast' | 'saturation' | 'hue' | 'exposure' | 'warmth'. */
  prop?: string;
  value?: number;
  /** For type: 'crop' — e.g. "1:1", "16:9". */
  ratio?: string;
  /** For type: 'rotate' — degrees, multiple of 90. */
  deg?: number;
  /** For type: 'resize'. */
  w?: number;
  h?: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}
