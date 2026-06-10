import cors from 'cors';
import express from 'express';

const PORT = process.env.PORT ?? 8787;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';

const app = express();
app.use(cors());
app.use(express.json({ limit: '25mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(ANTHROPIC_API_KEY) });
});

/**
 * Thin proxy in front of the Anthropic Messages API. The frontend never sees
 * ANTHROPIC_API_KEY; it only POSTs { system, messages, max_tokens } here.
 */
app.post('/api/claude', async (req, res) => {
  if (!ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' });
    return;
  }

  const { system, messages, max_tokens } = req.body ?? {};
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'Request body must include a "messages" array.' });
    return;
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: max_tokens ?? 1024,
        system,
        messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      res.status(response.status).json(data);
      return;
    }

    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'Failed to reach Anthropic API', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`PixelForge AI proxy listening on http://localhost:${PORT}`);
  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY is not set — Claude-powered features will return 503.');
  }
});
