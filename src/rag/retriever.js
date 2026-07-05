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

function dotProductSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

function euclideanDistance(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
}

function cosineSimilarityWithNormA(a, normA, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normB += b[i] * b[i];
  }
  const denom = normA * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function computeScore(queryEmbedding, queryNorm, chunkEmbedding, strategy) {
  switch (strategy) {
    case 'dot':
      return dotProductSimilarity(queryEmbedding, chunkEmbedding);
    case 'euclidean':
      const dist = euclideanDistance(queryEmbedding, chunkEmbedding);
      return dist === Infinity ? 0 : 1 / (1 + dist);
    case 'cosine':
    default:
      return cosineSimilarityWithNormA(queryEmbedding, queryNorm, chunkEmbedding);
  }
}

function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function computeBM25Scores(queryText, chunksPool) {
  const queryTerms = tokenize(queryText);
  if (!queryTerms.length || !chunksPool.length) return new Map();

  const N = chunksPool.length;
  const docTokens = chunksPool.map(c => tokenize(c.text));
  const docLengths = docTokens.map(t => t.length);
  const avgdl = docLengths.reduce((a, b) => a + b, 0) / N || 1;

  const df = {};
  queryTerms.forEach(term => {
    let count = 0;
    docTokens.forEach(tokens => {
      if (tokens.includes(term)) count++;
    });
    df[term] = count;
  });

  const k1 = 1.2;
  const b = 0.75;
  const scores = new Map();

  chunksPool.forEach((chunk, idx) => {
    const tokens = docTokens[idx];
    const docLen = docLengths[idx];
    let score = 0;

    queryTerms.forEach(term => {
      const tf = tokens.filter(t => t === term).length;
      if (tf === 0) return;

      const termDf = df[term] || 0;
      const idf = Math.log(1 + (N - termDf + 0.5) / (termDf + 0.5));
      const num = tf * (k1 + 1);
      const denom = tf + k1 * (1 - b + b * (docLen / avgdl));
      score += idf * (num / denom);
    });

    scores.set(chunk, score);
  });

  return scores;
}

export function searchChunks(queryEmbedding, chunks, options = {}) {
  const {
    topK = 5,
    similarityThreshold = 0.3,
    searchStrategy = 'cosine',
    docIds,
    queryText = '',
    hybridWeight = 0.0, // 0 = vector only, 1 = BM25 only
  } = options;

  let pool = chunks;
  if (docIds?.length) {
    pool = chunks.filter(c => docIds.includes(c.docId));
  }

  let queryNorm = 0;
  if (searchStrategy === 'cosine' && queryEmbedding?.length) {
    let sum = 0;
    for (let i = 0; i < queryEmbedding.length; i++) {
      sum += queryEmbedding[i] * queryEmbedding[i];
    }
    queryNorm = Math.sqrt(sum);
  }

  let dimensionWarningLogged = false;

  const vectorScored = pool
    .filter(c => {
      if (!c.embedding?.length) return false;
      if (c.embedding.length !== queryEmbedding.length) {
        if (!dimensionWarningLogged) {
          console.warn(`Dimension mismatch: query is ${queryEmbedding.length}, chunk is ${c.embedding.length}. Skipping chunks.`);
          dimensionWarningLogged = true;
        }
        return false;
      }
      return true;
    })
    .map(chunk => ({
      chunk,
      score: computeScore(queryEmbedding, queryNorm, chunk.embedding, searchStrategy),
    }))
    .filter(r => r.score >= similarityThreshold)
    .sort((a, b) => b.score - a.score);

  if (hybridWeight <= 0.0 || !queryText.trim()) {
    return vectorScored.slice(0, topK);
  }

  const bm25Map = computeBM25Scores(queryText, pool);
  const bm25Scored = pool
    .map(chunk => ({
      chunk,
      score: bm25Map.get(chunk) || 0,
    }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const rrfScores = new Map();
  const getRank = (list, chunk) => {
    const idx = list.findIndex(item => item.chunk === chunk);
    return idx === -1 ? Infinity : idx + 1;
  };

  pool.forEach(chunk => {
    const vRank = getRank(vectorScored, chunk);
    const bRank = getRank(bm25Scored, chunk);
    if (vRank === Infinity && bRank === Infinity) return;

    const vScore = vRank === Infinity ? 0 : 1 / (60 + vRank);
    const bScore = bRank === Infinity ? 0 : 1 / (60 + bRank);

    const combined = (1 - hybridWeight) * vScore + hybridWeight * bScore;
    rrfScores.set(chunk, {
      combined,
      vScore: vRank === Infinity ? 0 : vectorScored[vRank - 1].score,
      bScore: bRank === Infinity ? 0 : bm25Scored[bRank - 1].score,
    });
  });

  const scored = Array.from(rrfScores.entries())
    .map(([chunk, meta]) => ({
      chunk,
      score: meta.vScore,
      rrfScore: meta.combined,
      bm25Score: meta.bScore,
    }))
    .sort((a, b) => b.rrfScore - a.rrfScore)
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
