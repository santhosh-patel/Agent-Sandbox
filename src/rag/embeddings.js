// ========================================
// Embedding API Clients
// ========================================

import { RAG_PROVIDERS, EMBEDDING_PRICING } from './rag-providers.js';

function buildUrl(providerId, path, corsProxy = '') {
  const config = RAG_PROVIDERS[providerId];
  if (!config) throw new Error(`Unknown provider: ${providerId}`);
  const base = corsProxy
    ? corsProxy.replace(/\/+$/, '') + '/' + config.baseUrl.replace(/^https?:\/\//, '')
    : config.baseUrl;
  return `${base}${path}`;
}

function getHeaders(providerId, apiKey) {
  const config = RAG_PROVIDERS[providerId];
  return {
    'Content-Type': 'application/json',
    ...config.authHeader(apiKey),
  };
}

export async function createEmbeddings(providerId, apiKey, model, texts, corsProxy = '') {
  const config = RAG_PROVIDERS[providerId];
  if (!config?.supportsEmbeddings) {
    throw new Error(`${config?.name || providerId} does not support embeddings`);
  }

  const inputs = Array.isArray(texts) ? texts : [texts];

  switch (providerId) {
    case 'gemini':
      return await geminiEmbeddings(apiKey, model, inputs, corsProxy);
    case 'cohere':
      return await cohereEmbeddings(apiKey, model, inputs, corsProxy);
    default:
      return await openaiCompatibleEmbeddings(providerId, apiKey, model, inputs, corsProxy);
  }
}

async function openaiCompatibleEmbeddings(providerId, apiKey, model, inputs, corsProxy) {
  const config = RAG_PROVIDERS[providerId];
  const url = buildUrl(providerId, config.embeddingEndpoint, corsProxy);

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders(providerId, apiKey),
    body: JSON.stringify({ model, input: inputs }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || err.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const embeddings = (data.data || []).sort((a, b) => a.index - b.index).map(d => d.embedding);
  const tokens = data.usage?.total_tokens || data.usage?.prompt_tokens || 0;

  return { embeddings, tokens };
}

async function geminiEmbeddings(apiKey, model, inputs, corsProxy) {
  const embeddings = [];
  let totalTokens = 0;

  for (const text of inputs) {
    const path = `/models/${model}:embedContent?key=${apiKey}`;
    const url = buildUrl('gemini', path, corsProxy);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`,
        content: { parts: [{ text }] },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    embeddings.push(data.embedding?.values || []);
    totalTokens += Math.ceil(text.length / 4);
  }

  return { embeddings, tokens: totalTokens };
}

async function cohereEmbeddings(apiKey, model, inputs, corsProxy) {
  const url = buildUrl('cohere', '/embed', corsProxy);

  const res = await fetch(url, {
    method: 'POST',
    headers: getHeaders('cohere', apiKey),
    body: JSON.stringify({
      model,
      texts: inputs,
      input_type: 'search_document',
      embedding_types: ['float'],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const data = await res.json();
  const embeddings = data.embeddings?.float || data.embeddings || [];
  const tokens = data.meta?.billed_units?.input_tokens || 0;

  return { embeddings, tokens };
}

export async function validateApiKey(providerId, apiKey, corsProxy = '') {
  const config = RAG_PROVIDERS[providerId];
  if (!config) return { valid: false, message: 'Unknown provider' };

  try {
    if (providerId === 'gemini') {
      const url = buildUrl('gemini', `/models?key=${apiKey}`, corsProxy);
      const res = await fetch(url);
      if (res.ok) return { valid: true, message: 'API key is valid' };
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `HTTP ${res.status}` };
    }

    if (providerId === 'anthropic') {
      const url = buildUrl('anthropic', '/models', corsProxy);
      const res = await fetch(url, { headers: getHeaders('anthropic', apiKey) });
      if (res.ok) return { valid: true, message: 'API key is valid' };
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `HTTP ${res.status}` };
    }

    if (providerId === 'cohere') {
      if (apiKey.length > 10) return { valid: true, message: 'API key format looks valid' };
      return { valid: false, message: 'Invalid key format' };
    }

    if (config.modelsEndpoint) {
      const url = buildUrl(providerId, config.modelsEndpoint, corsProxy);
      const res = await fetch(url, { headers: getHeaders(providerId, apiKey) });
      if (res.ok) return { valid: true, message: 'API key is valid' };
      const err = await res.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `HTTP ${res.status}` };
    }

  if (apiKey.length > 10) return { valid: true, message: 'API key format looks valid' };
    return { valid: false, message: 'Could not validate key' };
  } catch (e) {
    return { valid: false, message: e.message };
  }
}

export async function listChatModels(providerId, apiKey, corsProxy = '') {
  const config = RAG_PROVIDERS[providerId];
  if (!config) return [];

  try {
    if (providerId === 'gemini') {
      const url = buildUrl('gemini', `/models?key=${apiKey}`, corsProxy);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.models || [])
        .filter(m => m.name?.includes('gemini') && m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    if (providerId === 'anthropic') {
      return config.defaultChatModels;
    }

    if (config.modelsEndpoint) {
      const url = buildUrl(providerId, config.modelsEndpoint, corsProxy);
      const res = await fetch(url, { headers: getHeaders(providerId, apiKey) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return (data.data || data.models || [])
        .map(m => ({ id: m.id || m.name, name: m.name || m.id }))
        .sort((a, b) => a.id.localeCompare(b.id));
    }

    return config.defaultChatModels;
  } catch {
    return config.defaultChatModels;
  }
}

export function estimateEmbeddingCost(model, tokens) {
  let pricing = EMBEDDING_PRICING[model];
  if (!pricing) {
    const key = Object.keys(EMBEDDING_PRICING).find(k => model.includes(k));
    if (key) pricing = EMBEDDING_PRICING[key];
  }
  if (!pricing) return null;
  return (tokens / 1_000_000) * pricing.input;
}
