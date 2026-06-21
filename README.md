# AI Playground

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
| `/` | AI Playground chat |
| `/rag` | RAG Sandbox (lazy-loaded) |
| Usage (top nav / settings) | In-app usage dashboard modal |
| `/share.html` | Read-only shared chat viewer |

## Privacy

All API keys and chat data stay in your browser (`localStorage` / `IndexedDB`). Nothing is sent to a backend except direct calls to your chosen LLM providers.

## Providers

Supports OpenRouter, OpenAI, Anthropic, Gemini, Groq, and DeepSeek. Anthropic may require a CORS proxy in the browser — OpenRouter is recommended for in-browser use.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm test` — run Vitest unit tests

## Features

- Multi-provider chat with streaming, images, compare mode
- Shared credentials across Playground and RAG
- Chat folders, pin/archive, export/share
- RAG pipeline testing with eval mode and IndexedDB storage
- Usage dashboard with cost tracking (estimated)
