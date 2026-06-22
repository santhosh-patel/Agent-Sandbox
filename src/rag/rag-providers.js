// ========================================
// RAG Provider Configurations
// ========================================

import { APP_NAME, RAG_LABEL } from '../shared/branding.js';
import { OPENAI_DEFAULT_CHAT_MODELS, mapOpenAIModels } from '../providers/openai-models.js';

export const RAG_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    color: '#10a37f',
    docsUrl: 'https://platform.openai.com/api-keys',
    baseUrl: 'https://api.openai.com/v1',
    supportsEmbeddings: true,
    supportsChat: true,
    embeddingModels: [
      { id: 'text-embedding-3-small', name: 'text-embedding-3-small' },
      { id: 'text-embedding-3-large', name: 'text-embedding-3-large' },
      { id: 'text-embedding-ada-002', name: 'text-embedding-ada-002' },
    ],
    defaultChatModels: OPENAI_DEFAULT_CHAT_MODELS,
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    embeddingEndpoint: '/embeddings',
    modelsEndpoint: '/models',
  },
  anthropic: {
    name: 'Anthropic',
    color: '#d97706',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    baseUrl: 'https://api.anthropic.com/v1',
    supportsEmbeddings: false,
    supportsChat: true,
    needsCorsProxy: true,
    embeddingModels: [],
    defaultChatModels: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
    ],
    authHeader: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    }),
    modelsEndpoint: null,
  },
  gemini: {
    name: 'Google Gemini',
    color: '#4285f4',
    docsUrl: 'https://aistudio.google.com/apikey',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsEmbeddings: true,
    supportsChat: true,
    embeddingModels: [
      { id: 'text-embedding-004', name: 'text-embedding-004' },
      { id: 'embedding-001', name: 'embedding-001' },
    ],
    defaultChatModels: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
    ],
    authHeader: () => ({}),
    embeddingEndpoint: '/models/{model}:embedContent',
    modelsEndpoint: '/models',
  },
  openrouter: {
    name: 'OpenRouter',
    color: '#6366f1',
    docsUrl: 'https://openrouter.ai/keys',
    baseUrl: 'https://openrouter.ai/api/v1',
    supportsEmbeddings: true,
    supportsChat: true,
    embeddingModels: [
      { id: 'openai/text-embedding-3-small', name: 'OpenAI text-embedding-3-small' },
      { id: 'openai/text-embedding-3-large', name: 'OpenAI text-embedding-3-large' },
    ],
    defaultChatModels: [
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
    ],
    authHeader: (key) => ({
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': `${APP_NAME} ${RAG_LABEL}`,
    }),
    embeddingEndpoint: '/embeddings',
    modelsEndpoint: '/models',
  },
  groq: {
    name: 'Groq',
    color: '#f97316',
    docsUrl: 'https://console.groq.com/keys',
    baseUrl: 'https://api.groq.com/openai/v1',
    supportsEmbeddings: false,
    supportsChat: true,
    embeddingModels: [],
    defaultChatModels: [
      { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant' },
    ],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    modelsEndpoint: '/models',
  },
  deepseek: {
    name: 'DeepSeek',
    color: '#0ea5e9',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    baseUrl: 'https://api.deepseek.com/v1',
    supportsEmbeddings: false,
    supportsChat: true,
    embeddingModels: [],
    defaultChatModels: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
    ],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    modelsEndpoint: '/models',
  },
  mistral: {
    name: 'Mistral',
    color: '#ff7000',
    docsUrl: 'https://console.mistral.ai/api-keys',
    baseUrl: 'https://api.mistral.ai/v1',
    supportsEmbeddings: true,
    supportsChat: true,
    embeddingModels: [
      { id: 'mistral-embed', name: 'mistral-embed' },
    ],
    defaultChatModels: [
      { id: 'mistral-small-latest', name: 'Mistral Small' },
      { id: 'mistral-large-latest', name: 'Mistral Large' },
    ],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    embeddingEndpoint: '/embeddings',
    modelsEndpoint: '/models',
  },
  cohere: {
    name: 'Cohere',
    color: '#39594d',
    docsUrl: 'https://dashboard.cohere.com/api-keys',
    baseUrl: 'https://api.cohere.com/v2',
    supportsEmbeddings: true,
    supportsChat: true,
    embeddingModels: [
      { id: 'embed-english-v3.0', name: 'embed-english-v3.0' },
      { id: 'embed-multilingual-v3.0', name: 'embed-multilingual-v3.0' },
    ],
    defaultChatModels: [
      { id: 'command-r-plus', name: 'Command R+' },
      { id: 'command-r', name: 'Command R' },
    ],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    embeddingEndpoint: '/embed',
    modelsEndpoint: null,
  },
  voyage: {
    name: 'Voyage AI',
    color: '#7c3aed',
    docsUrl: 'https://dash.voyageai.com/',
    baseUrl: 'https://api.voyageai.com/v1',
    supportsEmbeddings: true,
    supportsChat: false,
    embeddingModels: [
      { id: 'voyage-3', name: 'voyage-3' },
      { id: 'voyage-3-lite', name: 'voyage-3-lite' },
      { id: 'voyage-code-3', name: 'voyage-code-3' },
    ],
    defaultChatModels: [],
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    embeddingEndpoint: '/embeddings',
    modelsEndpoint: null,
  },
};

export const EMBEDDING_PROVIDERS = Object.entries(RAG_PROVIDERS)
  .filter(([, p]) => p.supportsEmbeddings)
  .map(([id, p]) => ({ id, name: p.name }));

export const CHAT_PROVIDERS = Object.entries(RAG_PROVIDERS)
  .filter(([, p]) => p.supportsChat)
  .map(([id, p]) => ({ id, name: p.name }));

export const ALL_PROVIDER_IDS = Object.keys(RAG_PROVIDERS);

export const DEFAULT_RAG_SETTINGS = {
  chunkSize: 512,
  chunkOverlap: 50,
  chunkStrategy: 'recursive',
  embeddingProvider: 'openai',
  embeddingModel: 'text-embedding-3-small',
  chatProvider: 'openai',
  chatModel: 'gpt-4o-mini',
  topK: 5,
  similarityThreshold: 0.3,
  searchStrategy: 'cosine',
  systemPrompt: 'You are a helpful assistant. Answer questions based on the provided context. If the context does not contain relevant information, say so clearly.',
  ragPrompt: 'Use the following context to answer the question. Cite relevant passages when possible.\n\nContext:\n{context}\n\nQuestion: {question}',
  corsProxyUrl: '',
  maxContextChars: 8000,
  retrievalDocIds: [],
  maxTokens: 4096,
  temperature: 0.3,
};

export const EMBEDDING_PRICING = {
  'text-embedding-3-small': { input: 0.02 },
  'text-embedding-3-large': { input: 0.13 },
  'text-embedding-ada-002': { input: 0.1 },
  'mistral-embed': { input: 0.1 },
  'embed-english-v3.0': { input: 0.1 },
  'voyage-3': { input: 0.06 },
  'voyage-3-lite': { input: 0.02 },
};
