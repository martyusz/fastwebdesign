import { useEditorStore } from '../store/editorStore';
import type { AIOperation } from './types';

/** Extracts a JSON array of operations from Claude's reply, tolerating markdown fences. */
export function parseOperations(text: string): AIOperation[] {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  const json = match ? match[0] : cleaned;
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of operations');
  return parsed as AIOperation[];
}

/** Applies parsed operations to the active layer/document and returns human-readable summaries. */
export function executeOperations(ops: AIOperation[]): string[] {
  const store = useEditorStore.getState();
  const applied: string[] = [];

  for (const op of ops) {
    switch (op.type) {
      case 'filter': {
        if (op.name === 'grayscale') {
          store.applyFilterDirect('grayscale', {});
          applied.push('grayscale');
        } else if (op.name === 'invert') {
          store.applyFilterDirect('invert', {});
          applied.push('invert');
        } else if (op.name === 'sepia') {
          store.applyFilterDirect('sepia', {});
          applied.push('sepia');
        } else if (op.name === 'blur' || op.name === 'gaussian-blur') {
          const radius = op.value ?? 8;
          store.applyFilterDirect('gaussian-blur', { radius });
          applied.push(`blur ${radius}px`);
        }
        break;
      }

      case 'adjust': {
        const value = op.value ?? 0;
        if (op.prop === 'brightness') {
          store.applyFilterDirect('brightness-contrast', { brightness: value, contrast: 0 });
          applied.push(`brightness ${value > 0 ? '+' : ''}${value}`);
        } else if (op.prop === 'contrast') {
          store.applyFilterDirect('brightness-contrast', { brightness: 0, contrast: value });
          applied.push(`contrast ${value > 0 ? '+' : ''}${value}`);
        } else if (op.prop === 'exposure') {
          store.applyFilterDirect('brightness-contrast', { brightness: value * 1.5, contrast: 0 });
          applied.push(`exposure ${value > 0 ? '+' : ''}${value}`);
        } else if (op.prop === 'saturation') {
          store.applyFilterDirect('hue-saturation', { hue: 0, saturation: value });
          applied.push(`saturation ${value > 0 ? '+' : ''}${value}`);
        } else if (op.prop === 'hue') {
          store.applyFilterDirect('hue-saturation', { hue: value, saturation: 0 });
          applied.push(`hue ${value > 0 ? '+' : ''}${value}°`);
        } else if (op.prop === 'warmth' || op.prop === 'temperature') {
          store.applyFilterDirect('hue-saturation', { hue: -value * 0.6, saturation: value * 0.3 });
          applied.push(`warmth ${value > 0 ? '+' : ''}${value}`);
        }
        break;
      }

      case 'crop': {
        const parts = (op.ratio ?? '').split(':').map(Number);
        if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) {
          store.cropToAspectRatio(parts[0], parts[1]);
          applied.push(`crop ${op.ratio}`);
        }
        break;
      }

      case 'rotate': {
        if (typeof op.deg === 'number' && op.deg !== 0) {
          store.rotateActiveLayerBy(op.deg);
          applied.push(`rotate ${op.deg}°`);
        }
        break;
      }

      case 'resize': {
        if (op.w && op.h && op.w > 0 && op.h > 0) {
          store.resizeImageTo(op.w, op.h);
          applied.push(`resize to ${op.w}×${op.h}`);
        }
        break;
      }
    }
  }

  return applied;
}

export const CHAT_SYSTEM_PROMPT = `You are an image-editing command parser for a browser-based photo editor.
Respond with ONLY a JSON array of operations, no prose, no markdown, no code fences.
Allowed operations:
- {"type":"filter","name":"grayscale"}
- {"type":"filter","name":"invert"}
- {"type":"filter","name":"sepia"}
- {"type":"filter","name":"blur","value": <radius in px, 0-50>}
- {"type":"adjust","prop":"brightness","value": <-100..100>}
- {"type":"adjust","prop":"contrast","value": <-100..100>}
- {"type":"adjust","prop":"saturation","value": <-100..100>}
- {"type":"adjust","prop":"hue","value": <-180..180>}
- {"type":"adjust","prop":"exposure","value": <-100..100>}
- {"type":"adjust","prop":"warmth","value": <-100..100, positive = warmer>}
- {"type":"crop","ratio": "<W:H>"}
- {"type":"rotate","deg": <multiple of 90>}
- {"type":"resize","w": <px>, "h": <px>}

Interpret the user's request and emit the operations needed to achieve it, in the order they
should be applied. If a request can't be mapped to an allowed operation, omit it. Always
respond with a JSON array, even if empty.`;
