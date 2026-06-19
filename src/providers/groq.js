// ========================================
// Groq Provider (OpenAI-compatible)
// ========================================

import { OpenAIProvider } from './openai.js';

export class GroqProvider extends OpenAIProvider {
  constructor(config = {}) {
    super({ ...config, baseUrl: 'https://api.groq.com/openai/v1' });
  }

  async listModels() {
    try {
      const res = await fetch(this.getUrl('/models'), {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.data || [])
        .filter(m => m.id && m.active !== false)
        .map(m => ({ id: m.id, name: m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
    } catch (e) {
      console.error('Failed to list Groq models:', e);
      return this.getDefaultModels();
    }
  }

  getDefaultModels() {
    return [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B' },
      { id: 'gemma2-9b-it', name: 'Gemma 2 9B' },
      { id: 'qwen-qwq-32b', name: 'Qwen QwQ 32B' },
    ];
  }

  buildRequestBody(messages, settings) {
    const body = super.buildRequestBody(messages, settings);
    // Groq doesn't support all OpenAI params
    delete body.frequency_penalty;
    delete body.presence_penalty;
    delete body.stream_options;
    return body;
  }
}
