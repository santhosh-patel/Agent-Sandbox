import { describe, it, expect, beforeEach, vi } from 'vitest';

const storage = {};

global.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = v; },
  removeItem: (k) => { delete storage[k]; },
};

describe('credentials', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
    vi.resetModules();
  });

  it('encodes and decodes API keys', async () => {
    const { credentials } = await import('./credentials.js');
    credentials.setApiKey('openai', 'sk-test-key');
    expect(credentials.getApiKey('openai')).toBe('sk-test-key');
    expect(credentials.hasApiKey('openai')).toBe(true);
  });

  it('migrates legacy playground keys', async () => {
    storage['ai-playground-state'] = JSON.stringify({
      apiKeys: { openai: btoa('aipg_legacy-key') },
      settings: { corsProxyUrl: 'https://proxy.test' },
    });
    const { credentials } = await import('./credentials.js');
    expect(credentials.getApiKey('openai')).toBe('legacy-key');
    expect(credentials.getCorsProxyUrl()).toBe('https://proxy.test');
  });
});
