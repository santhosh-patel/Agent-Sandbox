import { describe, it, expect, vi, beforeEach } from 'vitest';

global.window = { location: { origin: 'http://localhost:5173' } };

vi.mock('./state.js', () => ({
  state: { getAssistantName: () => 'Maya' },
}));

describe('export share link', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('builds share link for small chats', async () => {
    const { buildShareLink } = await import('./export.js');
    const chat = {
      title: 'Test',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello', model: 'gpt-4o' },
      ],
    };
    const result = buildShareLink(chat);
    expect(result.url).toContain('/share.html#');
    expect(result.tooLarge).toBe(false);
  });
});
