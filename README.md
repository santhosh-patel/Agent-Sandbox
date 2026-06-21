# Agent Sandbox

Experiment with models, agents, and knowledge systems.

A client-side LLM testing lab with multi-provider chat, model comparison, prompt library, and an integrated RAG sandbox.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173/` for chat or `http://localhost:5173/rag` for RAG.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Chat |
| `/rag` | RAG Sandbox (lazy-loaded) |
| Usage (top nav / settings) | In-app usage dashboard modal |
| `/share.html` | Read-only shared chat viewer |

## Privacy

All API keys and chat data stay in your browser (`localStorage` / `IndexedDB`). Nothing is sent to a backend except direct calls to your chosen LLM providers.

## Providers

Supports OpenRouter, OpenAI, Anthropic, Gemini, Groq, and DeepSeek. Anthropic may require a CORS proxy in the browser — OpenRouter is recommended for in-browser use.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm test` | Run Vitest unit tests |

## Features

### Chat

- Multi-provider chat with streaming, image attachments, and compare mode
- Prompt library with folders, pin/archive, export, and share links
- Confirmation dialogs before destructive actions (regenerate, clear chat, compare pick, retry, etc.)
- Roll back / undo for chat changes — **Roll back** button in the input bar or `⌘Z` / `Ctrl+Z`
- Drag-to-resize sidebar and settings panel (up to 50% wider than default)
- Floating glass input composer with model pill and cost estimate
- Contextual tooltips on toolbar and settings controls

### RAG Sandbox

- End-to-end RAG pipeline testing with chunking, retrieval, and eval mode
- IndexedDB-backed document storage; default collection name `defaultKB`
- Collection row menu (⋮) for rename and delete
- RAG chat matches Chat input layout (model pill, Roll back, Send/Stop)
- Message rollback after clear or other destructive changes
- Same resizable sidebar/settings panels as Chat

### Shared

- Credentials shared across Chat and RAG
- Usage dashboard modal with Chat/RAG tabs, export, and reset (estimated costs)
- Light/dark theme with Sorin design system
- Keyboard shortcuts — press `?` in the app for the full list

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `?` | Open shortcuts help |
| `/` | Focus message input |
| `⌘K` / `Ctrl+K` | Focus chat search |
| `⌘,` / `Ctrl+,` | Toggle settings panel |
| `⌘⇧N` / `Ctrl+Shift+N` | New chat |
| `⌘Z` / `Ctrl+Z` | Roll back last change (Chat) |
| `⌘Enter` / `Ctrl+Enter` | Send message |
| `Esc` | Close panels / cancel |

## Project layout

```
src/
  playground-app.js   # Chat view bootstrap
  app.js              # Router + shared shell
  state.js            # Chat state + undo stack
  ui/                 # Chat, sidebar, settings, tooltips, modals, usage panel
  rag/                # RAG state, chunker, retriever, providers
  usage/              # Usage data load/render/export
  providers/          # LLM provider registry
  styles/             # index.css + sorin-theme.css
```
