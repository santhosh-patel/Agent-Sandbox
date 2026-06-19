// ========================================
// Provider Registry — Maps provider names to adapter classes
// ========================================

import { OpenAIProvider } from './openai.js';
import { AnthropicProvider } from './anthropic.js';
import { GeminiProvider } from './gemini.js';
import { OpenRouterProvider } from './openrouter.js';
import { GroqProvider } from './groq.js';
import { DeepSeekProvider } from './deepseek.js';

export const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    class: OpenAIProvider,
    color: '#10a37f',
    icon: '🟢',
    description: 'GPT-4o, o1, o3, o4 and more',
    docsUrl: 'https://platform.openai.com/api-keys',
  },
  anthropic: {
    name: 'Anthropic',
    class: AnthropicProvider,
    color: '#d97706',
    icon: '🟠',
    description: 'Claude Sonnet, Opus, Haiku',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    needsCorsProxy: true,
  },
  gemini: {
    name: 'Google Gemini',
    class: GeminiProvider,
    color: '#4285f4',
    icon: '🔵',
    description: 'Gemini 2.5 Flash, Pro and more',
    docsUrl: 'https://aistudio.google.com/apikey',
  },
  openrouter: {
    name: 'OpenRouter',
    class: OpenRouterProvider,
    color: '#6366f1',
    icon: '🟣',
    description: 'Access 200+ models from all providers',
    docsUrl: 'https://openrouter.ai/keys',
  },
  groq: {
    name: 'Groq',
    class: GroqProvider,
    color: '#f97316',
    icon: '⚡',
    description: 'Ultra-fast Llama, Mixtral, Gemma',
    docsUrl: 'https://console.groq.com/keys',
  },
  deepseek: {
    name: 'DeepSeek',
    class: DeepSeekProvider,
    color: '#0ea5e9',
    icon: '🐋',
    description: 'DeepSeek V3 Chat & Reasoner',
    docsUrl: 'https://platform.deepseek.com/api_keys',
  },
};

// Pricing per 1M tokens (input / output) in USD
export const MODEL_PRICING = {
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10, output: 30 },
  'gpt-4': { input: 30, output: 60 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  'o1': { input: 15, output: 60 },
  'o1-mini': { input: 3, output: 12 },
  'o3-mini': { input: 1.1, output: 4.4 },
  'o4-mini': { input: 1.1, output: 4.4 },
  // Anthropic
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-3-5-sonnet-20241022': { input: 3, output: 15 },
  'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
  // Gemini
  'gemini-2.5-flash': { input: 0.15, output: 0.6 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-1.5-pro': { input: 1.25, output: 5 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  // DeepSeek
  'deepseek-chat': { input: 0.27, output: 1.1 },
  'deepseek-reasoner': { input: 0.55, output: 2.19 },
  // Groq (mostly free/very cheap)
  'llama-3.3-70b-versatile': { input: 0.59, output: 0.79 },
  'llama-3.1-8b-instant': { input: 0.05, output: 0.08 },
};

export function createProvider(providerName, apiKey, corsProxy = '') {
  const config = PROVIDERS[providerName];
  if (!config) throw new Error(`Unknown provider: ${providerName}`);
  return new config.class({ apiKey, corsProxy });
}

export function estimateCost(model, promptTokens, completionTokens) {
  // Try exact match first, then prefix match
  let pricing = MODEL_PRICING[model];
  if (!pricing) {
    const key = Object.keys(MODEL_PRICING).find(k => model.includes(k));
    if (key) pricing = MODEL_PRICING[key];
  }
  if (!pricing) return null;

  return (
    (promptTokens / 1_000_000) * pricing.input +
    (completionTokens / 1_000_000) * pricing.output
  );
}
