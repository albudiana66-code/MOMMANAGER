import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { ChatMessage } from '../types';

const SUPABASE_AI_PROXY = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-proxy`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const DIRECT_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';
const MODEL = 'claude-haiku-4-5-20251001';
const TIMEOUT_MS = 90_000;

function chatSystemPrompt(_lang: string) {
  return `You are MomManager AI. Respond only in English. Help with parenting, meals, scheduling, budgeting. Be warm and concise.`;
}

function featureSystemPrompt(_lang: string) {
  return `You are MomManager AI for busy mothers. Be practical and concise. Respond only in English.`;
}

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'apikey': SUPABASE_ANON_KEY,
};

// ── Direct Anthropic call (fallback when proxy unavailable) ──────────────────

async function callDirect(
  payload: object,
  signal: AbortSignal
): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': DIRECT_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(payload),
    signal,
  });
}

// ── Non-streaming (Android + fallback) ───────────────────────────────────────

async function callAPI(
  messages: { role: string; content: string }[],
  maxTokens: number,
  systemPrompt: string
): Promise<string> {
  const payload = { model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages };

  if (Capacitor.isNativePlatform()) {
    // Try proxy first; fall back to direct on error
    const res = await CapacitorHttp.post({ url: SUPABASE_AI_PROXY, headers: AUTH_HEADERS, data: payload })
      .catch(() => null);
    if (res && res.status === 200) return res.data.content[0]?.text || '';
    // Direct fallback on native
    if (DIRECT_API_KEY) {
      const r = await CapacitorHttp.post({
        url: 'https://api.anthropic.com/v1/messages',
        headers: { 'Content-Type': 'application/json', 'x-api-key': DIRECT_API_KEY, 'anthropic-version': '2023-06-01' },
        data: payload,
      });
      if (r.status === 200) return r.data.content[0]?.text || '';
      throw new Error(r.data?.error?.message || `HTTP ${r.status}`);
    }
    throw new Error(res?.data?.error?.message || 'AI service unavailable');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // Try proxy first
    let res = await fetch(SUPABASE_AI_PROXY, {
      method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify(payload), signal: controller.signal,
    }).catch(() => null);

    // Fall back to direct Anthropic if proxy fails or returns error
    if ((!res || !res.ok) && DIRECT_API_KEY) {
      res = await callDirect(payload, controller.signal);
    }

    if (!res || !res.ok) {
      const err = await res?.json().catch(() => ({})) ?? {};
      throw new Error(err.error?.message || `HTTP ${res?.status ?? 0}`);
    }
    const data = await res.json();
    return data.content[0]?.text || '';
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Streaming (web only, falls back to non-streaming on Android) ─────────────

async function callAPIStream(
  messages: { role: string; content: string }[],
  maxTokens: number,
  systemPrompt: string,
  onChunk: (text: string) => void
): Promise<void> {
  // Android: CapacitorHttp buffers full response — use non-streaming path
  if (Capacitor.isNativePlatform()) {
    const text = await callAPI(messages, maxTokens, systemPrompt);
    onChunk(text);
    return;
  }

  const payload = { model: MODEL, max_tokens: maxTokens, system: systemPrompt, messages, stream: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    // Try proxy; fall back to direct Anthropic if proxy fails
    let res = await fetch(SUPABASE_AI_PROXY, {
      method: 'POST', headers: AUTH_HEADERS, body: JSON.stringify(payload), signal: controller.signal,
    }).catch(() => null);

    if ((!res || !res.ok) && DIRECT_API_KEY) {
      res = await callDirect(payload, controller.signal);
    }

    if (!res || !res.ok || !res.body) {
      const err = await res?.json().catch(() => ({})) ?? {};
      throw new Error(err.error?.message || `HTTP ${res?.status ?? 0}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            onChunk(event.delta.text);
          }
        } catch { /* skip malformed SSE line */ }
      }
    }
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('Request timed out. Please try again.');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Streaming chat — tokens delivered via onChunk as they arrive. */
export async function sendMessageStream(
  messages: ChatMessage[],
  userMessage: string,
  lang: string,
  onChunk: (text: string) => void
): Promise<void> {
  const history = messages.map((m) => ({ role: m.role, content: m.content }));
  return callAPIStream(
    [...history, { role: 'user', content: userMessage }],
    1024,
    chatSystemPrompt(lang),
    onChunk
  );
}

/** Streaming feature call — tokens delivered via onChunk as they arrive. */
export async function askAIStream(
  prompt: string,
  maxTokens: number,
  lang: string,
  onChunk: (text: string) => void
): Promise<void> {
  return callAPIStream([{ role: 'user', content: prompt }], maxTokens, featureSystemPrompt(lang), onChunk);
}

/** Non-streaming fallback (kept for compatibility). */
export async function askAI(prompt: string, maxTokens = 1024, lang = 'en'): Promise<string> {
  return callAPI([{ role: 'user', content: prompt }], maxTokens, featureSystemPrompt(lang));
}
