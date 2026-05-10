import type { ChatMessage } from '../types';

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || '';

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  ro: 'Romanian',
  ru: 'Russian',
  uk: 'Ukrainian',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  it: 'Italian',
  pl: 'Polish',
};

const CHAT_SYSTEM_PROMPT = `You are MomManager AI assistant. Always respond in the same language that the user writes in. If they write in English, respond in English. If Romanian, respond in Romanian. If Russian, respond in Russian. Never switch languages unless the user switches first.
Help with parenting, scheduling, meal ideas, budgeting, and daily organization. Be warm, concise, and practical.`;

function buildFeatureSystemPrompt(lang: string): string {
  const langName = LANGUAGE_NAMES[lang] || 'English';
  return `You are MomManager AI, a helpful assistant for busy mothers.
Help with parenting, scheduling, meal ideas, budgeting, and daily organization.
Be warm, concise, and practical.
IMPORTANT: The app is currently set to ${langName}. You MUST respond entirely in ${langName}. Never switch languages.`;
}

async function callAPI(
  messages: { role: string; content: string }[],
  maxTokens = 1024,
  systemPrompt: string
): Promise<string> {
  const response = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error');
  }

  const data = await response.json();
  return data.content[0]?.text || '';
}

export async function sendMessage(
  messages: ChatMessage[],
  userMessage: string
): Promise<string> {
  const history = messages.map((m) => ({ role: m.role, content: m.content }));
  return callAPI([...history, { role: 'user', content: userMessage }], 1024, CHAT_SYSTEM_PROMPT);
}

export async function askAI(prompt: string, maxTokens = 2048, lang = 'en'): Promise<string> {
  return callAPI([{ role: 'user', content: prompt }], maxTokens, buildFeatureSystemPrompt(lang));
}
