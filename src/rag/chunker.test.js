import { describe, it, expect } from 'vitest';
import { chunkText } from './chunker.js';

describe('chunker', () => {
  it('splits text into chunks', () => {
    const text = 'Sentence one. Sentence two. Sentence three. Sentence four.';
    const chunks = chunkText(text, { chunkSize: 20, chunkOverlap: 5, strategy: 'sentence' });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].text.length).toBeLessThanOrEqual(25);
  });
});
