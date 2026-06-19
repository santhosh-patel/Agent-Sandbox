function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

export function supportsVision(provider) {
  return ['openai', 'anthropic', 'gemini', 'openrouter'].includes(provider);
}

export function formatMessagesForOpenAI(messages) {
  return messages.map(m => {
    if (m.role === 'user' && m.images?.length) {
      const parts = [];
      if (m.content?.trim()) parts.push({ type: 'text', text: m.content });
      for (const img of m.images) {
        parts.push({ type: 'image_url', image_url: { url: img.dataUrl, detail: 'auto' } });
      }
      return { role: m.role, content: parts.length ? parts : m.content };
    }
    return { role: m.role, content: m.content };
  });
}

export function formatMessagesForAnthropic(messages) {
  return messages.map(m => {
    if (m.role === 'user' && m.images?.length) {
      const parts = [];
      if (m.content?.trim()) parts.push({ type: 'text', text: m.content });
      for (const img of m.images) {
        const parsed = parseDataUrl(img.dataUrl);
        if (parsed) {
          parts.push({
            type: 'image',
            source: { type: 'base64', media_type: parsed.mimeType, data: parsed.data },
          });
        }
      }
      return { role: m.role, content: parts.length ? parts : m.content };
    }
    return { role: m.role, content: m.content };
  });
}

export function formatMessagesForGemini(messages) {
  return messages.map(m => {
    const parts = [];
    if (m.content?.trim()) parts.push({ text: m.content });
    if (m.role === 'user' && m.images?.length) {
      for (const img of m.images) {
        const parsed = parseDataUrl(img.dataUrl);
        if (parsed) {
          parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.data } });
        }
      }
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: parts.length ? parts : [{ text: m.content || '' }],
    };
  });
}
