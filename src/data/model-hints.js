export const MODEL_HINTS = {
  'gpt-4o': 'Best for: general purpose, vision',
  'gpt-4o-mini': 'Best for: fast, cost-effective',
  'o1': 'Best for: complex reasoning',
  'o3-mini': 'Best for: reasoning, cost-effective',
  'claude-sonnet': 'Best for: coding, analysis',
  'claude-opus': 'Best for: highest quality',
  'claude-haiku': 'Best for: fast responses',
  'gemini-2.5-flash': 'Best for: fast, multimodal',
  'gemini-2.5-pro': 'Best for: complex tasks',
  'deepseek-chat': 'Best for: coding, chat',
  'deepseek-reasoner': 'Best for: reasoning',
  'llama': 'Best for: fast open models',
};

export function getModelHint(modelId) {
  if (!modelId) return '';
  const key = Object.keys(MODEL_HINTS).find(k => modelId.includes(k));
  return key ? MODEL_HINTS[key] : 'General purpose model';
}
