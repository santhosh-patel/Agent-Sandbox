const FALLBACK_TEMPLATES = [
  'Can you explain that in more detail?',
  'What are some practical examples?',
  'What should I consider next?',
];

export function heuristicFollowUps(userQuestion) {
  const q = userQuestion.trim();
  if (!q) return FALLBACK_TEMPLATES.slice(0, 3);

  const short = q.length > 80 ? `${q.slice(0, 77)}…` : q;
  return [
    `Can you elaborate on "${short}"?`,
    'What are the key takeaways?',
    'What related topics should I explore?',
  ];
}

function parseFollowUpJson(text) {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map(s => s.trim()).filter(Boolean).slice(0, 3);
    }
  } catch {
    const match = trimmed.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          return parsed.map(String).map(s => s.trim()).filter(Boolean).slice(0, 3);
        }
      } catch {
        /* fall through */
      }
    }
  }

  const lines = trimmed
    .split('\n')
    .map(line => line.replace(/^[\d]+[.)]\s*/, '').replace(/^[-*]\s*/, '').trim())
    .filter(line => line.length > 5 && line.length < 200);

  if (lines.length >= 2) return lines.slice(0, 3);
  return null;
}

async function collectStreamText(provider, messages, settings, signal) {
  let text = '';
  for await (const chunk of provider.streamChat(messages, settings, signal)) {
    if (chunk.type === 'text') text += chunk.content;
  }
  return text;
}

export async function generateFollowUpQueries(provider, userQuestion, assistantResponse, settings) {
  const prompt = `Based on the conversation below, suggest exactly 3 short follow-up questions the user might ask next. Each question should be specific to the topic, under 100 characters, and written as the user would ask it.

User question: ${userQuestion.slice(0, 800)}

Assistant answer: ${assistantResponse.slice(0, 1500)}

Reply with ONLY a JSON array of 3 strings. Example: ["Question one?", "Question two?", "Question three?"]`;

  const followUpSettings = {
    ...settings,
    temperature: 0.6,
    maxTokens: 256,
    reasoningMode: false,
    systemPrompt: '',
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const raw = await collectStreamText(
      provider,
      [{ role: 'user', content: prompt }],
      followUpSettings,
      controller.signal,
    );
    const parsed = parseFollowUpJson(raw);
    if (parsed && parsed.length >= 2) return parsed;
    return heuristicFollowUps(userQuestion);
  } finally {
    clearTimeout(timeout);
  }
}
