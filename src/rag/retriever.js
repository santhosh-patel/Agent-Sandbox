// ========================================
// Vector Retrieval & Similarity Search
// ========================================

export function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export function dotProductSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function euclideanDistance(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function computeScore(queryEmbedding, chunkEmbedding, strategy) {
  switch (strategy) {
    case 'dot':
      return dotProductSimilarity(queryEmbedding, chunkEmbedding);
    case 'euclidean':
      const dist = euclideanDistance(queryEmbedding, chunkEmbedding);
      return dist === Infinity ? 0 : 1 / (1 + dist);
    case 'cosine':
    default:
      return cosineSimilarity(queryEmbedding, chunkEmbedding);
  }
}

export function searchChunks(queryEmbedding, chunks, options = {}) {
  const {
    topK = 5,
    similarityThreshold = 0.3,
    searchStrategy = 'cosine',
    docIds,
  } = options;

  let pool = chunks;
  if (docIds?.length) {
    pool = chunks.filter(c => docIds.includes(c.docId));
  }

  const scored = pool
    .filter(c => c.embedding?.length)
    .map(chunk => ({
      chunk,
      score: computeScore(queryEmbedding, chunk.embedding, searchStrategy),
    }))
    .filter(r => r.score >= similarityThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export function buildContext(retrieved, maxChars = 8000) {
  let context = '';
  for (const { chunk, score } of retrieved) {
    const entry = `[Source: ${chunk.docName || 'document'}, chunk ${chunk.index + 1}, score: ${score.toFixed(3)}]\n${chunk.text}\n\n`;
    if (context.length + entry.length > maxChars) break;
    context += entry;
  }
  return context.trim();
}

export function formatRagPrompt(template, context, question) {
  return template
    .replace(/\{context\}/g, context)
    .replace(/\{question\}/g, question);
}
