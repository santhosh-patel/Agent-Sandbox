export const API_HISTORY_TOKEN_LIMIT = 512;

export function estimateTokens(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return 0;
  return Math.ceil(trimmed.split(/\s+/).filter(Boolean).length * 1.3);
}

function truncateToTokenLimit(text, tokenLimit) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '';

  let truncated = '';
  for (let i = 0; i < words.length; i++) {
    const candidate = words.slice(0, i + 1).join(' ');
    if (estimateTokens(candidate) > tokenLimit) break;
    truncated = candidate;
  }

  if (truncated) return truncated;
  return words[0].slice(0, Math.max(1, Math.floor(tokenLimit / 1.3)));
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
