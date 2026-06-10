import { create } from 'zustand';
import { askClaude, askClaudeVision } from '../ai/claudeClient';
import { removeBackground } from '../ai/backgroundRemoval';
import { CHAT_SYSTEM_PROMPT, executeOperations, parseOperations } from '../ai/chatOps';
import { complementaryPalette, extractPalette } from '../ai/colorPalette';
import { compositeAllLayers } from '../engine/layer';
import { useEditorStore } from './editorStore';
import type { ChatMessage } from '../ai/types';

const SEO_SYSTEM_PROMPT = `You are an SEO assistant for a photo editor. Look at the image and return ONLY JSON
(no markdown, no prose) of the form: {"altText": string (max 125 chars), "filename": string (kebab-case, no
extension), "keywords": string[]}.`;

const ROAST_SYSTEM_PROMPT = `You are a brutally honest but constructive design critic reviewing an image edited
in a design tool. Give exactly 3 sharp critiques and 3 quick fixes, as a short punchy list. Keep it a little
funny but genuinely useful. Plain text only, no markdown headers.`;

function activeLayerCanvas(): HTMLCanvasElement | null {
  const state = useEditorStore.getState();
  return state.layers.find((l) => l.id === state.activeLayerId)?.canvas ?? null;
}

function compositeCanvas(): HTMLCanvasElement {
  const state = useEditorStore.getState();
  return compositeAllLayers(state.layers, state.width, state.height);
}

function canvasToBase64(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL('image/png').replace(/^data:image\/png;base64,/, '');
}

interface SeoResult {
  altText: string;
  filename: string;
  keywords: string[];
}

interface AIState {
  panelOpen: boolean;
  togglePanel: () => void;

  chatMessages: ChatMessage[];
  chatLoading: boolean;
  sendChatMessage: (text: string) => Promise<void>;

  bgRemovalLoading: boolean;
  bgRemovalStatus: string | null;
  removeBackgroundFromActiveLayer: () => Promise<void>;

  seoLoading: boolean;
  seoResult: SeoResult | null;
  describeForSeo: () => Promise<void>;

  paletteLoading: boolean;
  palette: string[] | null;
  complementary: string[] | null;
  extractColorPalette: () => void;

  roastLoading: boolean;
  roastResult: string | null;
  roastDesign: () => Promise<void>;

  error: string | null;
  dismissError: () => void;
}

export const useAIStore = create<AIState>((set, get) => ({
  panelOpen: false,
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  chatMessages: [],
  chatLoading: false,
  sendChatMessage: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().chatLoading) return;

    set((s) => ({
      chatMessages: [...s.chatMessages, { role: 'user', content: trimmed }],
      chatLoading: true,
      error: null,
    }));

    const result = await askClaude(CHAT_SYSTEM_PROMPT, trimmed, 512);
    if ('error' in result) {
      set({ chatLoading: false, error: result.error });
      return;
    }

    let reply: string;
    try {
      const ops = parseOperations(result.text);
      const applied = executeOperations(ops);
      reply = applied.length > 0 ? `Applied: ${applied.join(', ')}.` : "I couldn't find anything to apply for that.";
    } catch {
      reply = "Sorry, I couldn't understand how to apply that. Try rephrasing.";
    }

    set((s) => ({
      chatMessages: [...s.chatMessages, { role: 'assistant', content: reply }],
      chatLoading: false,
    }));
  },

  bgRemovalLoading: false,
  bgRemovalStatus: null,
  removeBackgroundFromActiveLayer: async () => {
    if (get().bgRemovalLoading) return;
    const canvas = activeLayerCanvas();
    if (!canvas) return;

    set({ bgRemovalLoading: true, bgRemovalStatus: 'Starting…', error: null });
    try {
      const result = await removeBackground(canvas, (status) => set({ bgRemovalStatus: status }));
      useEditorStore.getState().replaceActiveLayerCanvas(result, 'Remove Background');
      set({ bgRemovalLoading: false, bgRemovalStatus: null });
    } catch (err) {
      set({ bgRemovalLoading: false, bgRemovalStatus: null, error: `Background removal failed: ${String(err)}` });
    }
  },

  seoLoading: false,
  seoResult: null,
  describeForSeo: async () => {
    if (get().seoLoading) return;
    set({ seoLoading: true, error: null, seoResult: null });

    const base64 = canvasToBase64(compositeCanvas());
    const result = await askClaudeVision(SEO_SYSTEM_PROMPT, 'Describe this image for SEO.', base64);
    if ('error' in result) {
      set({ seoLoading: false, error: result.error });
      return;
    }

    try {
      const cleaned = result.text.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '').trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : cleaned) as SeoResult;
      set({ seoLoading: false, seoResult: parsed });
    } catch {
      set({ seoLoading: false, error: 'Could not parse the AI response.' });
    }
  },

  paletteLoading: false,
  palette: null,
  complementary: null,
  extractColorPalette: () => {
    const canvas = activeLayerCanvas();
    if (!canvas) return;
    set({ paletteLoading: true });
    const palette = extractPalette(canvas, 5);
    set({ palette, complementary: complementaryPalette(palette), paletteLoading: false });
  },

  roastLoading: false,
  roastResult: null,
  roastDesign: async () => {
    if (get().roastLoading) return;
    set({ roastLoading: true, error: null, roastResult: null });

    const base64 = canvasToBase64(compositeCanvas());
    const result = await askClaudeVision(ROAST_SYSTEM_PROMPT, 'Roast this design.', base64, 'image/png', 512);
    if ('error' in result) {
      set({ roastLoading: false, error: result.error });
      return;
    }
    set({ roastLoading: false, roastResult: result.text.trim() });
  },

  error: null,
  dismissError: () => set({ error: null }),
}));
