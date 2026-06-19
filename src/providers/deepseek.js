// ========================================
// DeepSeek Provider (OpenAI-compatible)
// ========================================

import { OpenAIProvider } from './openai.js';

export class DeepSeekProvider extends OpenAIProvider {
  constructor(config = {}) {
    super({ ...config, baseUrl: 'https://api.deepseek.com' });
  }

  async listModels() {
    // DeepSeek has a small fixed set of models
    return this.getDefaultModels();
  }

  getDefaultModels() {
    return [
      { id: 'deepseek-chat', name: 'DeepSeek Chat (V3)' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner (R1)' },
    ];
  }

  buildRequestBody(messages, settings) {
    const body = super.buildRequestBody(messages, settings);
    delete body.stream_options;
    return body;
  }
}
