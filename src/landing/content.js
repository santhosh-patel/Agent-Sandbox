import { APP_NAME, APP_TAGLINE, RAG_LABEL } from '../shared/branding.js';

export const PROVIDERS = [
  { name: 'OpenRouter', use: 'Access many models through one API key' },
  { name: 'OpenAI', use: 'GPT-4o, o-series, vision models' },
  { name: 'Anthropic', use: 'Claude — may need a CORS proxy in browser' },
  { name: 'Google Gemini', use: 'Fast multimodal models' },
  { name: 'Groq', use: 'Ultra-fast open models (Llama, Mixtral)' },
  { name: 'DeepSeek', use: 'Reasoning and coding models' },
];

export const FEATURES = [
  { title: 'Compare mode', body: 'Enable in Settings, select up to 3 models, and send one prompt. Responses appear side by side — pick a winner to keep.' },
  { title: 'Prompt library', body: 'Save prompts from the composer or build a library in the sidebar. Search and reuse across chats.' },
  { title: 'Vision / images', body: 'Attach or paste images into the composer on models that support vision input.' },
  { title: 'Reasoning mode', body: 'Toggle reasoning in Settings for models that expose chain-of-thought. Expand thinking blocks in responses.' },
  { title: 'Parameter presets', body: 'Creative, Precise, Coding, and more — quick temperature and token presets in Settings.' },
  { title: 'PWA install', body: 'Install from the browser prompt for home-screen access and offline shell loading.' },
];

export const QUICK_START = [
  { title: 'Choose a provider', body: 'Open Settings from the top nav or sidebar and select the provider you want to use.' },
  { title: 'Add your API key', body: 'Paste your key and click Verify. Keys are stored only in your browser\'s local storage.' },
  { title: 'Pick a model', body: 'Choose a model from the dropdown. The status pill in the top bar shows your current provider and model.' },
  { title: 'Send a message', body: 'Type in the composer at the bottom and press Enter or click Send.' },
];

export const MARQUEE_ITEMS = PROVIDERS.map((p) => p.name);

export const LANDING = {
  appName: APP_NAME,
  tagline: APP_TAGLINE,
  ragLabel: RAG_LABEL,
  overview: {
    eyebrow: 'Overview',
    headline: 'Your browser is the lab.',
    body: `${APP_NAME} is a browser-based workspace for experimenting with large language models, agents, and knowledge systems. Bring your own provider API keys, switch models instantly, compare outputs, and keep a local history of conversations — all without creating an account or sending data through a backend server.`,
  },
  providers: {
    eyebrow: 'Providers',
    headline: 'Six gateways. One workspace.',
    body: 'Pick any supported provider in Settings, add your API key, and choose a model — switch providers anytime without losing chat history.',
  },
  features: {
    eyebrow: 'Features',
    headline: 'Built for experimentation.',
    body: 'Compare models, save prompts, attach images, tune parameters, and install as a PWA — everything you need to iterate fast.',
  },
  rag: {
    eyebrow: RAG_LABEL,
    headline: 'Knowledge systems, in the same shell.',
    body: 'Upload documents, chunk and embed them locally, run retrieval queries, and evaluate answers — a dedicated sandbox for RAG workflows alongside chat.',
  },
  privacy: {
    eyebrow: 'Privacy',
    headline: 'Nothing leaves your device unless you send it.',
    body: 'Everything runs client-side. Chats, API keys, usage stats, and settings live in localStorage on your device. Messages go directly from your browser to the provider you configure — this app has no server that stores your conversations.',
  },
  quickStart: {
    eyebrow: 'Quick start',
    headline: 'Four steps to your first reply.',
    body: 'No signup. No backend. Just your keys and a browser.',
  },
  cta: {
    primary: 'Open the app',
    closing: 'Enter the sandbox',
    rag: `Explore ${RAG_LABEL}`,
  },
};
