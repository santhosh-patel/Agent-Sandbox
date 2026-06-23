// ========================================
// OpenAI Provider
// ========================================

import { BaseProvider } from './base.js';

import { formatMessagesForOpenAI } from './message-format.js';
import {
  OPENAI_DEFAULT_CHAT_MODELS,
  mapOpenAIModels,
  isOpenAIReasoningModel,
} from './openai-models.js';

export class OpenAIProvider extends BaseProvider {
  constructor(config = {}) {
    super({ ...config, baseUrl: config.baseUrl || 'https://api.openai.com/v1' });
  }

  async validateKey() {
    try {
      const res = await fetch(this.getUrl('/models'), {
        headers: this.getHeaders(),
      });
      if (res.ok) return { valid: true, message: 'API key is valid' };
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `HTTP ${res.status}` };
    } catch (e) {
      return { valid: false, message: e.message };
    }
  }

  async listModels() {
    try {
      const res = await fetch(this.getUrl('/models'), {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return mapOpenAIModels(data.data);
    } catch (e) {
      console.error('Failed to list OpenAI models:', e);
      return this.getDefaultModels();
    }
  }

  getDefaultModels() {
    return OPENAI_DEFAULT_CHAT_MODELS;
  }

  buildRequestBody(messages, settings) {
    const body = {
      model: settings.model,
      messages: [],
      stream: true,
      stream_options: { include_usage: true },
    };

    // System prompt
    if (settings.systemPrompt) {
      body.messages.push({ role: 'system', content: settings.systemPrompt });
    }

    body.messages.push(...formatMessagesForOpenAI(messages));

    // o-series models use reasoning_effort, not temperature
    const isReasoningModel = isOpenAIReasoningModel(settings.model);

    if (isReasoningModel) {
      if (settings.reasoningMode && settings.reasoningEffort) {
        body.reasoning_effort = settings.reasoningEffort;
      }
      body.max_completion_tokens = settings.maxTokens;
    } else {
      body.temperature = settings.temperature;
      body.max_tokens = settings.maxTokens;
      body.top_p = settings.topP;
      if (settings.frequencyPenalty !== 0) body.frequency_penalty = settings.frequencyPenalty;
      if (settings.presencePenalty !== 0) body.presence_penalty = settings.presencePenalty;
    }

    return body;
  }

  async *streamChat(messages, settings, abortSignal) {
    const body = this.buildRequestBody(messages, settings);

    const res = await fetch(this.getUrl('/chat/completions'), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    let usage = null;
    for await (const chunk of this.parseSSEStream(res)) {
      if (chunk.usage) {
        usage = chunk.usage;
      }
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        yield { type: 'text', content: delta.content };
      }
      // Reasoning tokens (for o-series)
      if (delta?.reasoning_content) {
        yield { type: 'thinking', content: delta.reasoning_content };
      }
    }

    if (usage) {
      yield { type: 'usage', usage };
    }
  }
}
