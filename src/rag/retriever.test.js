import { describe, it, expect } from 'vitest';
import { cosineSimilarity, searchChunks } from './retriever.js';

describe('retriever', () => {
  it('computes cosine similarity', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('filters by threshold and topK', () => {
    const chunks = [
      { text: 'a', embedding: [1, 0], index: 0, docName: 'd' },
      { text: 'b', embedding: [0.9, 0.1], index: 1, docName: 'd' },
      { text: 'c', embedding: [0, 1], index: 2, docName: 'd' },
    ];
    const results = searchChunks([1, 0], chunks, { topK: 2, similarityThreshold: 0.5 });
    expect(results.length).toBe(2);
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });
});
