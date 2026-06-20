// ========================================
// Text Chunking Strategies
// ========================================

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function splitBySentences(text) {
  return text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
}

function splitByParagraphs(text) {
  return text.split(/\n\s*\n/).filter(s => s.trim());
}

export function chunkText(text, options = {}) {
  const {
    chunkSize = 512,
    chunkOverlap = 50,
    strategy = 'recursive',
  } = options;

  const normalized = text.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  let rawChunks;

  switch (strategy) {
    case 'fixed':
      rawChunks = chunkFixed(normalized, chunkSize, chunkOverlap);
      break;
    case 'sentence':
      rawChunks = chunkSentence(normalized, chunkSize, chunkOverlap);
      break;
    case 'recursive':
    default:
      rawChunks = chunkRecursive(normalized, chunkSize, chunkOverlap);
      break;
  }

  return rawChunks.map((text, index) => ({
    id: createId(),
    text,
    index,
    charStart: normalized.indexOf(text),
    charEnd: normalized.indexOf(text) + text.length,
  }));
}

function chunkFixed(text, size, overlap) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start += size - overlap;
  }
  return chunks;
}

function chunkSentence(text, maxSize, overlap) {
  const sentences = splitBySentences(text);
  const chunks = [];
  let current = '';

  for (const sentence of sentences) {
    if (current.length + sentence.length + 1 <= maxSize) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current) chunks.push(current);
      if (sentence.length > maxSize) {
        const sub = chunkFixed(sentence, maxSize, overlap);
        chunks.push(...sub);
        current = '';
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current);

  if (overlap > 0 && chunks.length > 1) {
    return mergeOverlap(chunks, overlap);
  }
  return chunks;
}

function chunkRecursive(text, maxSize, overlap) {
  const separators = ['\n\n', '\n', '. ', ' '];
  const chunks = [];

  function split(textPart, sepIndex) {
    if (textPart.length <= maxSize) {
      if (textPart.trim()) chunks.push(textPart.trim());
      return;
    }

    if (sepIndex >= separators.length) {
      const fixed = chunkFixed(textPart, maxSize, overlap);
      chunks.push(...fixed);
      return;
    }

    const sep = separators[sepIndex];
    const parts = textPart.split(sep);

    if (parts.length === 1) {
      split(textPart, sepIndex + 1);
      return;
    }

    let current = '';
    for (const part of parts) {
      const candidate = current ? current + sep + part : part;
      if (candidate.length <= maxSize) {
        current = candidate;
      } else {
        if (current) split(current, sepIndex + 1);
        current = part;
      }
    }
    if (current) split(current, sepIndex + 1);
  }

  split(text, 0);
  return chunks;
}

function mergeOverlap(chunks, overlap) {
  if (overlap <= 0 || chunks.length <= 1) return chunks;
  const result = [chunks[0]];
  for (let i = 1; i < chunks.length; i++) {
    const prev = result[result.length - 1];
    const overlapText = prev.slice(-overlap);
    result.push(overlapText + chunks[i]);
  }
  return result;
}
