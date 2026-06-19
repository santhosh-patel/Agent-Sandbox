// ========================================
// OpenRouter Provider (OpenAI-compatible)
// ========================================

import { OpenAIProvider } from './openai.js';

export class OpenRouterProvider extends OpenAIProvider {
  constructor(config = {}) {
    super({ ...config, baseUrl: 'https://openrouter.ai/api/v1' });
  }

  getHeaders() {
    return {
      ...super.getHeaders(),
      'HTTP-Referer': window.location.origin,
      'X-Title': 'AI Playground',
    };
  }

  async listModels() {
    try {
      // OpenRouter doesn't require auth for model listing
      const res = await fetch('https://openrouter.ai/api/v1/models');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.data || [])
        .filter(m => m.id && !m.id.includes(':free'))
        .slice(0, 200)
        .map(m => ({
          id: m.id,
          name: m.name || m.id,
          context: m.context_length,
          pricing: m.pricing,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('Failed to list OpenRouter models:', e);
      return this.getDefaultModels();
    }
  }

  getDefaultModels() {
    return [
      { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'OpenAI GPT-4o Mini' },
      { id: 'anthropic/claude-sonnet-4', name: 'Anthropic Claude Sonnet 4' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Anthropic Claude 3.5 Sonnet' },
      { id: 'google/gemini-2.5-flash', name: 'Google Gemini 2.5 Flash' },
      { id: 'google/gemini-2.5-pro', name: 'Google Gemini 2.5 Pro' },
      { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B' },
      { id: 'deepseek/deepseek-chat', name: 'DeepSeek V3' },
    ];
  }
}
