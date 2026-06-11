interface ClaudeContentBlock {
  type: string;
  text?: string;
}

interface ClaudeSuccess {
  content: ClaudeContentBlock[];
}

interface ClaudeFailure {
  error: string;
}

async function postClaude(body: Record<string, unknown>): Promise<ClaudeSuccess | ClaudeFailure> {
  let response: Response;
  try {
    response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { error: 'Could not reach the AI proxy server. Is it running (npm run dev:server)?' };
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data && (data.error?.message ?? data.error)) || `Request failed (${response.status})`;
    return { error: typeof message === 'string' ? message : JSON.stringify(message) };
  }
  return data as ClaudeSuccess;
}

function extractText(result: ClaudeSuccess | ClaudeFailure): { text: string } | { error: string } {
  if ('error' in result) return { error: result.error };
  const text = result.content.find((block) => block.type === 'text')?.text ?? '';
  return { text };
}

/** Sends a plain-text prompt to Claude via the local proxy. */
export async function askClaude(
  system: string,
  prompt: string,
  maxTokens = 1024,
): Promise<{ text: string } | { error: string }> {
  const result = await postClaude({
    system,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
  });
  return extractText(result);
}

/** Sends a base64-encoded image plus a prompt to Claude vision via the local proxy. */
export async function askClaudeVision(
  system: string,
  prompt: string,
  imageBase64: string,
  mediaType = 'image/png',
  maxTokens = 1024,
): Promise<{ text: string } | { error: string }> {
  const result = await postClaude({
    system,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: maxTokens,
  });
  return extractText(result);
}
