// ========================================
// Anthropic Provider
// ========================================

import { BaseProvider } from './base.js';

export class AnthropicProvider extends BaseProvider {
  constructor(config = {}) {
    super({ ...config, baseUrl: config.baseUrl || 'https://api.anthropic.com' });
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };
  }

  async validateKey() {
    try {
      const res = await fetch(this.getUrl('/v1/models'), {
        headers: this.getHeaders(),
      });
      if (res.ok) return { valid: true, message: 'API key is valid' };
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `HTTP ${res.status}` };
    } catch (e) {
      if (e.message.includes('Failed to fetch') || e.message.includes('CORS')) {
        return { valid: false, message: 'CORS error — please set a CORS proxy URL or use OpenRouter for Anthropic models.' };
      }
      return { valid: false, message: e.message };
    }
  }

  async listModels() {
    try {
      const res = await fetch(this.getUrl('/v1/models'), {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.data || [])
        .map(m => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('Failed to list Anthropic models:', e);
      return this.getDefaultModels();
    }
  }

  getDefaultModels() {
    return [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4' },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
    ];
  }

  buildRequestBody(messages, settings) {
    const body = {
      model: settings.model,
      max_tokens: settings.maxTokens || 4096,
      stream: true,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (settings.systemPrompt) {
      body.system = settings.systemPrompt;
    }

    body.temperature = settings.temperature;
    if (settings.topP !== 1.0) body.top_p = settings.topP;

    // Extended thinking
    if (settings.reasoningMode) {
      const budgetMap = { low: 5000, medium: 10000, high: 20000 };
      body.thinking = {
        type: 'enabled',
        budget_tokens: budgetMap[settings.reasoningEffort] || 10000,
      };
      // Remove temperature when thinking is enabled
      delete body.temperature;
    }

    return body;
  }

  async *streamChat(messages, settings, abortSignal) {
    const body = this.buildRequestBody(messages, settings);

    const res = await fetch(this.getUrl('/v1/messages'), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    // Anthropic uses its own SSE format
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let usage = null;
    let currentBlockType = null;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('event: ')) {
            // Track event type
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));

              switch (data.type) {
                case 'content_block_start':
                  currentBlockType = data.content_block?.type;
                  break;

                case 'content_block_delta':
                  if (data.delta?.type === 'text_delta') {
                    yield { type: 'text', content: data.delta.text };
                  } else if (data.delta?.type === 'thinking_delta') {
                    yield { type: 'thinking', content: data.delta.thinking };
                  }
                  break;

                case 'message_delta':
                  if (data.usage) {
                    usage = {
                      prompt_tokens: 0,
                      completion_tokens: data.usage.output_tokens || 0,
                      total_tokens: data.usage.output_tokens || 0,
                    };
                  }
                  break;

                case 'message_start':
                  if (data.message?.usage) {
                    const u = data.message.usage;
                    usage = {
                      prompt_tokens: u.input_tokens || 0,
                      completion_tokens: u.output_tokens || 0,
                      total_tokens: (u.input_tokens || 0) + (u.output_tokens || 0),
                    };
                  }
                  break;

                case 'message_stop':
                  break;
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    if (usage) {
      yield { type: 'usage', usage };
    }
  }
}
