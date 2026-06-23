import { describe, it, expect } from 'vitest';
import { isOpenAIChatModel, mapOpenAIModels } from './openai-models.js';

describe('openai-models', () => {
  it('includes chat models and excludes embeddings', () => {
    const models = mapOpenAIModels([
      { id: 'gpt-5.4' },
      { id: 'gpt-4o' },
      { id: 'o3-mini' },
      { id: 'text-embedding-3-small' },
      { id: 'whisper-1' },
      { id: 'dall-e-3' },
    ]);

    expect(models.map(m => m.id)).toEqual(['gpt-4o', 'gpt-5.4', 'o3-mini']);
  });

  it('recognizes o-series and chatgpt aliases', () => {
    expect(isOpenAIChatModel('o1-pro')).toBe(true);
    expect(isOpenAIChatModel('chatgpt-4o-latest')).toBe(true);
    expect(isOpenAIChatModel('codex-mini-latest')).toBe(true);
    expect(isOpenAIChatModel('gpt-3.5-turbo-instruct')).toBe(false);
  });
});
