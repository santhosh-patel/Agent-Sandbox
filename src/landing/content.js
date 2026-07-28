import { APP_NAME, APP_TAGLINE, RAG_LABEL, CHAT_LABEL } from '../shared/branding.js';

export const PROVIDERS = [
  { name: 'OpenRouter', use: 'Access many models through one API key' },
  { name: 'OpenAI', use: 'GPT-4o, o-series, vision models' },
  { name: 'Anthropic', use: 'Claude — may need a CORS proxy in browser' },
  { name: 'Google Gemini', use: 'Fast multimodal models' },
  { name: 'Groq', use: 'Ultra-fast open models (Llama, Mixtral)' },
  { name: 'DeepSeek', use: 'Reasoning and coding models' },
];

export const HERO_BADGES = ['Browser-based', 'Bring your own keys', 'No account required', 'Client-side only'];

export const INTEGRATION_CHIPS = [
  'OpenRouter', 'OpenAI', 'Anthropic', 'Gemini', 'Groq', 'DeepSeek',
  CHAT_LABEL, RAG_LABEL, 'Compare mode', 'PWA',
];

export const WORKSPACES = [
  {
    title: CHAT_LABEL,
    command: '/app',
    bestFor: 'Multi-provider chat, compare mode, prompt library, exports',
    limits: 'Messages go directly to the provider you configure. Keys stay in localStorage.',
    action: 'app',
  },
  {
    title: RAG_LABEL,
    command: '/rag',
    bestFor: 'Document upload, chunking, embeddings, retrieval, eval',
    limits: 'Full RAG pipeline in-browser via IndexedDB. Separate embedding and chat providers.',
    action: 'rag',
  },
];

export const CAPABILITIES = [
  {
    tag: 'Core',
    title: 'Multi-provider chat',
    body: 'Switch between OpenRouter, OpenAI, Anthropic, Gemini, Groq, and DeepSeek without losing history. Per-chat provider overrides supported.',
    example: `Settings → Provider → Verify key → Pick model\n\nStatus pill shows: OpenAI · gpt-4o`,
  },
  {
    tag: 'Compare',
    title: 'Side-by-side model comparison',
    body: 'Enable compare mode, select up to 3 models, send one prompt, and pick the best response to keep in the thread.',
    example: `Compare mode: ON\nModels: gpt-4o · claude-sonnet · gemini-flash\nPrompt: "Explain RAG in 3 bullets"`,
  },
  {
    tag: 'Prompts',
    title: 'Prompt library',
    body: 'Save prompts from the composer or curate a reusable library in the sidebar. Search and insert into any chat.',
    example: `Save from composer → Prompt library\nSearch "code review" → Insert into chat`,
  },
  {
    tag: 'Vision',
    title: 'Image & attachment support',
    body: 'Attach or paste images into the composer on vision-capable models. Supports multimodal experimentation in one thread.',
    example: `Paste screenshot → Send\nModel reads image + text in one request`,
  },
  {
    tag: 'Reasoning',
    title: 'Reasoning & thinking blocks',
    body: 'Toggle reasoning mode for models that expose chain-of-thought. Expand or collapse thinking blocks in responses.',
    example: `Settings → Reasoning: ON\nResponse shows expandable thinking section`,
  },
  {
    tag: 'Presets',
    title: 'Parameter presets',
    body: 'Creative, Precise, Coding, and custom temperature / max-token presets. Override per chat when needed.',
    example: `Preset: Coding\ntemperature: 0.2 · max_tokens: 4096`,
  },
  {
    tag: 'RAG',
    title: 'Knowledge base pipeline',
    body: 'Upload PDF, DOCX, TXT, and Markdown. Chunk, embed locally, retrieve at query time, and chat grounded on your docs.',
    example: `Upload handbook.pdf → Index\nAsk: "What is our refund policy?"`,
  },
  {
    tag: 'Eval',
    title: 'RAG evaluation',
    body: 'Run eval sets against your pipeline. Inspect retrieved chunks, similarity scores, and the exact context sent to the model.',
    example: `Eval set: 10 questions\nInspect: top-k chunks + scores`,
  },
  {
    tag: 'Usage',
    title: 'Token & cost tracking',
    body: 'Track requests, tokens, estimated cost, and latency for Chat and RAG separately. Export usage JSON from the dashboard.',
    example: `Usage → Chat · RAG · All\nExport JSON for billing review`,
  },
  {
    tag: 'Export',
    title: 'Export & share conversations',
    body: 'Download Markdown or HTML, copy share links, or bulk import/export all chats and settings from Settings → Data.',
    example: `Chat ⋯ → Export Markdown\nSettings → Data → Export all`,
  },
  {
    tag: 'PWA',
    title: 'Install as PWA',
    body: 'Install from the browser for home-screen access and offline shell loading. Works like a native app without an app store.',
    example: `Browser → Install Agent Sandbox\nLaunch from home screen`,
  },
  {
    tag: 'Privacy',
    title: 'Local-first data',
    body: 'Chats, keys, and settings live in localStorage. RAG vectors in IndexedDB. No backend stores your conversations.',
    example: `All data: your browser only\nProvider API: direct from client`,
  },
];

export const CHAT_MANAGEMENT = [
  { title: 'New chat', body: 'Sidebar button or ⌘/Ctrl+Shift+N' },
  { title: 'Search', body: 'Filter by title or message content in the sidebar' },
  { title: 'Pin / Archive', body: '⋯ menu on any chat; filter with All / Pinned / Archive tabs' },
  { title: 'Rename & folders', body: 'Click title or use ⋯ to rename; organize chats into folders' },
  { title: 'Regenerate / Edit', body: 'Action buttons on assistant and user messages' },
  { title: 'Per-chat settings', body: 'Override global provider, model, or system prompt for one thread' },
];

export const RAG_FEATURES = [
  { area: 'Documents', detail: 'PDF, DOCX, TXT, Markdown — drag-and-drop upload' },
  { area: 'Collections', detail: 'Multiple knowledge bases with isolated docs and chat history' },
  { area: 'Chunking', detail: 'Configurable chunk size, overlap, and strategy' },
  { area: 'Embeddings', detail: 'Separate embedding provider, model, and API key' },
  { area: 'Retrieval', detail: 'Top-k, similarity threshold, hybrid weight, document scope' },
  { area: 'Chat model', detail: 'Independent chat provider from embeddings' },
  { area: 'Inspect', detail: 'View retrieved chunks, scores, and assembled context' },
  { area: 'Import/Export', detail: 'Backup collections as JSON' },
];

export const USE_CASES = [
  {
    title: 'Model evaluator',
    body: 'Compare GPT, Claude, and Gemini on the same prompts. Pick winners and keep the best thread.',
    tags: ['Compare', 'Chat', 'Providers'],
  },
  {
    title: 'Prompt engineer',
    body: 'Build a prompt library, tune temperature presets, and iterate on system prompts per task.',
    tags: ['Prompts', 'Presets', 'Chat'],
  },
  {
    title: 'RAG builder',
    body: 'Upload docs, tune chunking and retrieval, inspect context, and run eval sets before shipping.',
    tags: [RAG_LABEL, 'Eval', 'Embeddings'],
  },
  {
    title: 'Privacy-conscious tinkerer',
    body: 'Keep keys and history local. No account, no backend. Direct browser-to-provider calls only.',
    tags: ['Privacy', 'BYOK', 'PWA'],
  },
];

export const COMPARE_ROWS = [
  { feature: 'Multi-provider in one UI', sandbox: true, webChat: false, cli: 'Partial' },
  { feature: 'Side-by-side compare (3 models)', sandbox: true, webChat: false, cli: false },
  { feature: 'RAG pipeline sandbox', sandbox: true, webChat: false, cli: 'Custom build' },
  { feature: 'Local chat history & folders', sandbox: true, webChat: 'Account-bound', cli: 'Manual' },
  { feature: 'Bring your own API keys', sandbox: true, webChat: false, cli: true },
  { feature: 'No backend / no account', sandbox: true, webChat: false, cli: true },
  { feature: 'Export MD / HTML / share links', sandbox: true, webChat: 'Limited', cli: 'Manual' },
  { feature: 'Usage & cost dashboard', sandbox: true, webChat: false, cli: false },
];

export const SHORTCUTS = [
  { keys: '/', action: 'Focus message input' },
  { keys: '⌘/Ctrl K', action: 'Search chats' },
  { keys: '⌘/Ctrl ,', action: 'Toggle settings panel' },
  { keys: '⌘/Ctrl Shift N', action: 'New chat' },
  { keys: '⌘/Ctrl Enter', action: 'Send message' },
  { keys: 'Shift Enter', action: 'New line in composer' },
  { keys: 'Esc', action: 'Close panels / stop generation' },
  { keys: '?', action: 'Quick shortcuts reference' },
];

export const FAQ = [
  {
    q: 'Is Agent Sandbox free?',
    a: 'The app is free to use. You pay only for the API usage billed by your chosen providers (OpenAI, Anthropic, etc.).',
  },
  {
    q: 'Where is my data stored?',
    a: 'Chats, settings, and API keys live in your browser localStorage. RAG documents and embeddings use IndexedDB. Nothing is stored on an application server.',
  },
  {
    q: 'Do I need an account?',
    a: 'No. Open the app, paste a provider API key, pick a model, and start chatting. No signup or login.',
  },
  {
    q: 'Which providers are supported?',
    a: 'OpenRouter, OpenAI, Anthropic, Google Gemini, Groq, and DeepSeek. Anthropic may require a CORS proxy URL in Settings when calling from the browser.',
  },
  {
    q: 'How does compare mode work?',
    a: 'Enable compare in Settings, select up to three models, send one prompt, and view responses side by side. Pick a winner to keep that response in the thread.',
  },
  {
    q: 'What is RAG Sandbox?',
    a: 'A dedicated workspace for retrieval-augmented generation. Upload documents, configure chunking and embeddings, retrieve relevant passages, and chat with models grounded on your knowledge base.',
  },
  {
    q: 'Can I export my conversations?',
    a: 'Yes. Export individual chats as Markdown or HTML from the sidebar ⋯ menu, or bulk export all chats and settings from Settings → Data.',
  },
  {
    q: 'Why did my API key verification fail?',
    a: 'Check the key is valid and has credits. For Anthropic in-browser, add a CORS proxy in Settings. Click Refresh after verifying to load models.',
  },
];

export const SETUP_STEPS = [
  {
    title: 'Open the playground',
    body: 'Click Open the app or go to /app. No install required — runs entirely in your browser.',
    code: `Open → /app\nOr install as PWA from browser prompt`,
  },
  {
    title: 'Configure a provider',
    body: 'Open Settings, pick a provider, paste your API key, and click Verify. Keys stay in localStorage only.',
    code: `Settings → Provider: OpenAI\nAPI key → Verify → Refresh models`,
  },
  {
    title: 'Start experimenting',
    body: 'Send messages, compare models, save prompts, or open RAG Sandbox to test knowledge pipelines.',
    code: `Chat → Send prompt\nOr /rag → Upload docs → Ask questions`,
  },
];

export const FEATURES = CAPABILITIES.slice(0, 6).map(({ title, body }) => ({ title, body }));

export const QUICK_START = [
  { title: 'Choose a provider', body: 'Open Settings from the top nav or sidebar and select the provider you want to use.' },
  { title: 'Add your API key', body: 'Paste your key and click Verify. Keys are stored only in your browser\'s local storage.' },
  { title: 'Pick a model', body: 'Choose a model from the dropdown. The status pill in the top bar shows your current provider and model.' },
  { title: 'Send a message', body: 'Type in the composer at the bottom and press Enter or click Send.' },
];

export const MARQUEE_ITEMS = INTEGRATION_CHIPS;

export const LANDING = {
  appName: APP_NAME,
  tagline: APP_TAGLINE,
  ragLabel: RAG_LABEL,
  chatLabel: CHAT_LABEL,
  hero: {
    eyebrow: 'LLM Playground · Client-side · Open experimentation',
    headline: 'Experiment with models, agents, and knowledge systems',
    subhead: 'A browser workspace for multi-provider chat, side-by-side model comparison, prompt libraries, and a full RAG pipeline — all with your own API keys and zero backend.',
  },
  overview: {
    eyebrow: 'Overview',
    headline: 'Your browser is the lab.',
    body: `${APP_NAME} is a browser-based workspace for experimenting with large language models, agents, and knowledge systems. Bring your own provider API keys, switch models instantly, compare outputs, and keep a local history of conversations — all without creating an account or sending data through a backend server.`,
  },
  workspaces: {
    eyebrow: 'Two workspaces',
    headline: 'Chat playground and RAG sandbox.',
    body: 'One app, two dedicated environments. Switch between conversational experimentation and retrieval-augmented generation without leaving your browser.',
  },
  providers: {
    eyebrow: 'Providers',
    headline: 'Six gateways. One workspace.',
    body: 'Pick any supported provider in Settings, add your API key, and choose a model — switch providers anytime without losing chat history.',
  },
  capabilities: {
    eyebrow: 'Capabilities',
    headline: 'Built for serious experimentation.',
    body: 'Everything you need to evaluate models, tune prompts, run RAG pipelines, and track usage — engineered for speed and privacy.',
  },
  features: {
    eyebrow: 'Chat features',
    headline: 'Everything in the playground.',
    body: 'Compare models, save prompts, attach images, tune parameters, and install as a PWA.',
  },
  chatManagement: {
    eyebrow: 'Chat management',
    headline: 'Organize every conversation.',
    body: 'Search, pin, archive, folder, rename, regenerate, and edit — full control over your local chat history.',
  },
  export: {
    eyebrow: 'Export & sharing',
    headline: 'Take your work with you.',
    body: 'Download conversations, share encoded links, or bulk import and export all data from Settings.',
  },
  rag: {
    eyebrow: RAG_LABEL,
    headline: 'Knowledge systems, in the same shell.',
    body: 'Upload documents, chunk and embed them locally, run retrieval queries, evaluate answers, and chat grounded on your knowledge base — a dedicated sandbox for RAG workflows.',
  },
  privacy: {
    eyebrow: 'Privacy',
    headline: 'Nothing leaves your device unless you send it.',
    body: 'Everything runs client-side. Chats, API keys, usage stats, and settings live in localStorage. RAG vectors live in IndexedDB. Messages go directly from your browser to the provider you configure — this app has no server that stores your conversations.',
  },
  architecture: {
    eyebrow: 'Architecture',
    headline: 'Client-side by design.',
    body: 'No application backend. Your browser handles UI, storage, parsing, chunking, embedding orchestration, and direct API calls to the providers you configure.',
  },
  useCases: {
    eyebrow: 'Use cases',
    headline: 'Built for real workflows.',
    body: 'Whether you are evaluating models, engineering prompts, or building RAG — Agent Sandbox meets you where you work.',
  },
  compare: {
    eyebrow: 'Compare',
    headline: `Why ${APP_NAME}?`,
    body: 'See how a dedicated local playground stacks up against generic web chat and DIY CLI setups.',
  },
  quickStart: {
    eyebrow: 'Setup',
    headline: 'Getting started in three steps.',
    body: 'Open the app, add a key, and start experimenting in minutes.',
  },
  shortcuts: {
    eyebrow: 'Shortcuts',
    headline: 'Keyboard-first workflow.',
    body: 'Power-user shortcuts for search, settings, new chats, and sending messages.',
  },
  faq: {
    eyebrow: 'FAQ',
    headline: 'Common questions.',
    body: 'Quick answers about providers, privacy, compare mode, RAG, and exports.',
  },
  cta: {
    primary: 'Open the app',
    closing: 'Start experimenting today',
    rag: `Explore ${RAG_LABEL}`,
  },
};
