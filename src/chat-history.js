export const API_HISTORY_TOKEN_LIMIT = 512;

export function estimateTokens(text) {
const API_HISTORY_TOKEN_LIMIT = 512;

function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export function trimMessageContent(text, tokenLimit = 512) {
  if (!text) return text;
  let words = text.split(/\s+/);
  if (estimateTokens(text) <= tokenLimit) return text;

  let candidate = '';
  for (const word of words) {
    if (estimateTokens(candidate + ' ' + word) > tokenLimit) break;
    candidate += (candidate ? ' ' : '') + word;
  }
  return candidate + '…';
}

export function buildApiHistory(messages, tokenLimit = API_HISTORY_TOKEN_LIMIT) {
  const eligible = messages
    .filter(m => !m.compareId && (String(m.content || '').trim() || m.images?.length))
    .map(m => ({
      role: m.role,
      content: m.content || '',
      ...(m.images?.length ? { images: m.images } : {}),
    }));

  const selected = [];
  let totalTokens = 0;

  for (let i = eligible.length - 1; i >= 0; i--) {
    const msg = eligible[i];
    const msgTokens = estimateTokens(msg.content);

    if (selected.length === 0) {
      if (msgTokens <= tokenLimit) {
        selected.unshift(msg);
        totalTokens = msgTokens;
      } else {
        selected.unshift({
          role: msg.role,
          content: truncateToTokenLimit(msg.content, tokenLimit),
        });
      }
      continue;
    }

    if (totalTokens + msgTokens > tokenLimit) break;

    selected.unshift(msg);
    totalTokens += msgTokens;
  }

  return selected;
}
