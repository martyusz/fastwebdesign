import { useEffect, useRef, useState } from 'react';
import { useAIStore } from '../store/aiStore';
import { useEditorStore } from '../store/editorStore';
import { Icon, ICONS } from './icons';

function AISection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-black/40 px-3 py-3">
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">{title}</h3>
      {children}
    </section>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="rounded border border-black/40 bg-black/20 px-2 py-0.5 text-[11px] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

function ChatPanel() {
  const messages = useAIStore((s) => s.chatMessages);
  const loading = useAIStore((s) => s.chatLoading);
  const send = useAIStore((s) => s.sendChatMessage);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  function submit() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    void send(text);
  }

  return (
    <div className="flex flex-col gap-2">
      <div ref={scrollRef} className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 && (
          <p className="text-xs text-zinc-500">
            Ask me to edit your image, e.g. "make it black and white and crop to a square".
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] rounded-md px-2 py-1.5 text-xs ${
              m.role === 'user'
                ? 'self-end bg-[#7c5cff]/20 text-zinc-100'
                : 'self-start bg-white/5 text-zinc-300'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="self-start text-xs text-zinc-500">Thinking…</div>}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="Describe an edit…"
          className="flex-1 rounded bg-white/5 px-2 py-1.5 text-xs text-zinc-100 outline-none focus:ring-1 focus:ring-[#7c5cff]"
        />
        <button
          type="button"
          onClick={submit}
          disabled={loading || !input.trim()}
          className="rounded bg-[#7c5cff] px-2.5 py-1.5 text-xs text-white hover:bg-[#6a4ce0] disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}

function BackgroundRemovalSection() {
  const loading = useAIStore((s) => s.bgRemovalLoading);
  const status = useAIStore((s) => s.bgRemovalStatus);
  const run = useAIStore((s) => s.removeBackgroundFromActiveLayer);
  const activeLayer = useEditorStore((s) => s.layers.find((l) => l.id === s.activeLayerId));
  const disabled = loading || !activeLayer || activeLayer.locked;

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void run()}
        disabled={disabled}
        className="rounded border border-black/40 bg-black/20 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors"
      >
        {loading ? status ?? 'Working…' : 'Remove Background'}
      </button>
      <p className="text-[11px] text-zinc-500">
        Runs locally in your browser (no API key needed). The first run downloads a small AI model.
      </p>
    </div>
  );
}

function SeoSection() {
  const loading = useAIStore((s) => s.seoLoading);
  const result = useAIStore((s) => s.seoResult);
  const run = useAIStore((s) => s.describeForSeo);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="rounded border border-black/40 bg-black/20 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors"
      >
        {loading ? 'Analyzing…' : 'Describe for SEO'}
      </button>
      {result && (
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Alt text</span>
              <CopyButton text={result.altText} />
            </div>
            <p className="rounded bg-black/20 px-2 py-1 text-zinc-200">{result.altText}</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Filename</span>
              <CopyButton text={result.filename} />
            </div>
            <p className="mono rounded bg-black/20 px-2 py-1 text-zinc-200">{result.filename}</p>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-zinc-500">
              <span>Keywords</span>
              <CopyButton text={result.keywords.join(', ')} />
            </div>
            <div className="flex flex-wrap gap-1">
              {result.keywords.map((kw) => (
                <span key={kw} className="rounded bg-black/20 px-1.5 py-0.5 text-zinc-300">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PaletteSection() {
  const loading = useAIStore((s) => s.paletteLoading);
  const palette = useAIStore((s) => s.palette);
  const complementary = useAIStore((s) => s.complementary);
  const run = useAIStore((s) => s.extractColorPalette);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="rounded border border-black/40 bg-black/20 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors"
      >
        {loading ? 'Extracting…' : 'Extract Color Palette'}
      </button>
      {palette && (
        <>
          <Swatches title="Palette" colors={palette} />
          {complementary && <Swatches title="Complementary" colors={complementary} />}
        </>
      )}
    </div>
  );
}

function Swatches({ title, colors }: { title: string; colors: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[11px] text-zinc-500">
        <span>{title}</span>
        <CopyButton text={colors.join(', ')} />
      </div>
      <div className="flex gap-1.5">
        {colors.map((hex) => (
          <div key={hex} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="h-8 w-full rounded border border-black/40"
              style={{ backgroundColor: hex }}
              title={hex}
            />
            <span className="mono text-[10px] text-zinc-400">{hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoastSection() {
  const loading = useAIStore((s) => s.roastLoading);
  const result = useAIStore((s) => s.roastResult);
  const run = useAIStore((s) => s.roastDesign);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        className="rounded border border-black/40 bg-black/20 px-2 py-1.5 text-xs text-zinc-200 hover:bg-white/5 hover:text-white disabled:opacity-40 transition-colors"
      >
        {loading ? 'Judging…' : '🔥 Roast My Design'}
      </button>
      {result && (
        <div className="rounded-lg border border-[#7c5cff]/30 bg-gradient-to-br from-[#7c5cff]/10 to-transparent p-3">
          <p className="whitespace-pre-line text-xs text-zinc-200">{result}</p>
        </div>
      )}
    </div>
  );
}

export function AIPanel() {
  const open = useAIStore((s) => s.panelOpen);
  const close = useAIStore((s) => s.togglePanel);
  const error = useAIStore((s) => s.error);
  const dismissError = useAIStore((s) => s.dismissError);

  if (!open) return null;

  return (
    <aside className="w-72 shrink-0 overflow-y-auto bg-[#18181b] border-l border-black/40 flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-black/40">
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-100">
          <Icon path={ICONS.sparkles} className="text-[#7c5cff]" />
          AI Assistant
        </span>
        <button type="button" onClick={close} className="text-zinc-500 hover:text-white">
          <Icon path={ICONS.close} />
        </button>
      </div>

      {error && (
        <div className="mx-3 mt-2 flex items-start justify-between gap-2 rounded border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
          <span>{error}</span>
          <button type="button" onClick={dismissError} className="shrink-0 text-red-300 hover:text-white">
            ×
          </button>
        </div>
      )}

      <AISection title="Ask AI">
        <ChatPanel />
      </AISection>
      <AISection title="Background Removal">
        <BackgroundRemovalSection />
      </AISection>
      <AISection title="SEO Metadata">
        <SeoSection />
      </AISection>
      <AISection title="Color Palette">
        <PaletteSection />
      </AISection>
      <AISection title="Design Feedback">
        <RoastSection />
      </AISection>
    </aside>
  );
}
