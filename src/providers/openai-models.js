// OpenAI chat model catalog and /v1/models filtering

export const OPENAI_DEFAULT_CHAT_MODELS = [
  { id: 'gpt-5.5', name: 'GPT-5.5' },
  { id: 'gpt-5.5-pro', name: 'GPT-5.5 Pro' },
  { id: 'gpt-5.4', name: 'GPT-5.4' },
  { id: 'gpt-5.4-pro', name: 'GPT-5.4 Pro' },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4 Mini' },
  { id: 'gpt-5.4-nano', name: 'GPT-5.4 Nano' },
  { id: 'gpt-5.3-chat-latest', name: 'GPT-5.3 Chat' },
  { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
  { id: 'gpt-5.2', name: 'GPT-5.2' },
  { id: 'gpt-5.2-pro', name: 'GPT-5.2 Pro' },
  { id: 'gpt-5.2-chat-latest', name: 'GPT-5.2 Chat' },
  { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
  { id: 'gpt-5.1', name: 'GPT-5.1' },
  { id: 'gpt-5.1-mini', name: 'GPT-5.1 Mini' },
  { id: 'gpt-5.1-codex', name: 'GPT-5.1 Codex' },
  { id: 'gpt-5.1-codex-mini', name: 'GPT-5.1 Codex Mini' },
  { id: 'gpt-5.1-chat-latest', name: 'GPT-5.1 Chat' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano' },
  { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o Latest' },
  { id: 'gpt-4o-search-preview', name: 'GPT-4o Search Preview' },
  { id: 'gpt-4o-mini-search-preview', name: 'GPT-4o Mini Search Preview' },
  { id: 'gpt-4o-audio-preview', name: 'GPT-4o Audio Preview' },
  { id: 'gpt-4o-mini-audio-preview', name: 'GPT-4o Mini Audio Preview' },
  { id: 'o3', name: 'o3' },
  { id: 'o3-mini', name: 'o3 Mini' },
  { id: 'o3-deep-research', name: 'o3 Deep Research' },
  { id: 'o4-mini', name: 'o4 Mini' },
  { id: 'o4-mini-deep-research', name: 'o4 Mini Deep Research' },
  { id: 'o1', name: 'o1' },
  { id: 'o1-mini', name: 'o1 Mini' },
  { id: 'o1-pro', name: 'o1 Pro' },
  { id: 'o1-preview', name: 'o1 Preview' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'gpt-4', name: 'GPT-4' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
  { id: 'codex-mini-latest', name: 'Codex Mini' },
];

const MODEL_NAMES = Object.fromEntries(
  OPENAI_DEFAULT_CHAT_MODELS.map(m => [m.id, m.name]),
);

const EXCLUDED_PATTERNS = [
  /^text-embedding/,
  /^tts-/,
  /^whisper-/,
  /^dall-e/,
  /^gpt-image/,
  /^omni-moderation/,
  /moderation/,
  /^davinci/,
  /^babbage/,
  /^curie/,
  /^ada/,
  /-transcribe/,
  /realtime/,
  /^sora/,
  /^computer-use/,
  /^ft:/,
  /-completions$/,
  /instruct/,
];

const CHAT_PREFIXES = ['gpt-', 'chatgpt-', 'o1', 'o3', 'o4', 'codex-'];

export function formatOpenAIModelName(id) {
  return MODEL_NAMES[id] || id;
}

export function isOpenAIChatModel(id) {
  if (!id || typeof id !== 'string') return false;
  if (EXCLUDED_PATTERNS.some(pattern => pattern.test(id))) return false;
  return CHAT_PREFIXES.some(prefix => id.startsWith(prefix));
}

export function mapOpenAIModels(models) {
  return (models || [])
    .filter(m => isOpenAIChatModel(m.id))
    .map(m => ({ id: m.id, name: formatOpenAIModelName(m.id) }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function isOpenAIReasoningModel(model) {
  return /^(o[0-9]|gpt-5)/.test(model || '');
}
