// ========================================
// Gemini Provider (Google Generative AI)
// ========================================

import { BaseProvider } from './base.js';

export class GeminiProvider extends BaseProvider {
  constructor(config = {}) {
    super({ ...config, baseUrl: config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta' });
  }

  getHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  async validateKey() {
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      if (res.ok) return { valid: true, message: 'API key is valid' };
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `HTTP ${res.status}` };
    } catch (e) {
      return { valid: false, message: e.message };
    }
  }

  async listModels() {
    try {
      const res = await fetch(`${this.baseUrl}/models?key=${this.apiKey}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.models || [])
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({
          id: m.name.replace('models/', ''),
          name: m.displayName || m.name.replace('models/', ''),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (e) {
      console.error('Failed to list Gemini models:', e);
      return this.getDefaultModels();
    }
  }

  getDefaultModels() {
    return [
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
    ];
  }

  buildRequestBody(messages, settings) {
    const contents = [];

    // Convert messages to Gemini format
    for (const msg of messages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    const body = {
      contents,
      generationConfig: {
        temperature: settings.temperature,
        maxOutputTokens: settings.maxTokens,
        topP: settings.topP,
      },
    };

    if (settings.systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: settings.systemPrompt }],
      };
    }

    // Thinking mode for Gemini 2.5
    if (settings.reasoningMode) {
      const budgetMap = { low: 2048, medium: 8192, high: 24576 };
      body.generationConfig.thinkingConfig = {
        thinkingBudget: budgetMap[settings.reasoningEffort] || 8192,
      };
    }

    return body;
  }

  async *streamChat(messages, settings, abortSignal) {
    const body = this.buildRequestBody(messages, settings);
    const model = settings.model;

    const res = await fetch(
      `${this.baseUrl}/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKey}`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
        signal: abortSignal,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    let totalTokens = 0;
    // Parse Gemini SSE stream
    for await (const chunk of this.parseSSEStream(res)) {
      if (chunk.candidates?.[0]?.content?.parts) {
        for (const part of chunk.candidates[0].content.parts) {
          if (part.thought) {
            yield { type: 'thinking', content: part.text };
          } else if (part.text) {
            yield { type: 'text', content: part.text };
          }
        }
      }
      if (chunk.usageMetadata) {
        const um = chunk.usageMetadata;
        totalTokens = um.totalTokenCount || 0;
        yield {
          type: 'usage',
          usage: {
            prompt_tokens: um.promptTokenCount || 0,
            completion_tokens: um.candidatesTokenCount || 0,
            total_tokens: totalTokens,
          },
        };
      }
    }
  }
}
