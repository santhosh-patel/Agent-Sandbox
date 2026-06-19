// ========================================
// Base Provider — Common interface for all API providers
// ========================================

export class BaseProvider {
  constructor(config = {}) {
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || '';
    this.corsProxy = config.corsProxy || '';
  }

  getUrl(path) {
    const base = this.corsProxy
      ? this.corsProxy.replace(/\/+$/, '') + '/' + this.baseUrl.replace(/^https?:\/\//, '')
      : this.baseUrl;
    return `${base}${path}`;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  async validateKey() {
    throw new Error('Not implemented');
  }

  async listModels() {
    throw new Error('Not implemented');
  }

  buildRequestBody(messages, settings) {
    throw new Error('Not implemented');
  }

  async *streamChat(messages, settings, abortSignal) {
    throw new Error('Not implemented');
  }

  // Parse SSE stream lines (OpenAI-compatible)
  async *parseSSEStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (trimmed === 'data: [DONE]') return;
          if (trimmed.startsWith('data: ')) {
            try {
              const json = JSON.parse(trimmed.slice(6));
              yield json;
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
