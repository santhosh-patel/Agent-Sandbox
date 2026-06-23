# Agent Sandbox

**Experiment with models, agents, and knowledge systems.**

Agent Sandbox is a browser-based workspace for testing large language models and retrieval-augmented generation (RAG) pipelines. Bring your own API keys, keep your data local, and iterate quickly without standing up a backend.

**Repository:** [github.com/santhosh-patel/Agent-Sandbox](https://github.com/santhosh-patel/Agent-Sandbox)

---

## Why I built this

Most LLM tools are tied to a single provider, require an account, or route your conversations through a server you do not control. That makes it harder to compare models fairly, tune prompts, or prototype RAG setups in a private environment.

I created Agent Sandbox to solve that for myself and for others who want a practical, hands-on lab:

- **Compare providers and models** in one place — switch between OpenRouter, OpenAI, Anthropic, Gemini, Groq, and DeepSeek without losing your workflow.
- **Test RAG end to end** — upload documents, chunk and embed them, tune retrieval, and chat against your knowledge base, all in the browser.
- **Stay in control of your data** — API keys, chats, and documents live in your browser (`localStorage` / IndexedDB). There is no Agent Sandbox backend; requests go only to the providers you configure.
- **Move fast while experimenting** — streaming responses, compare mode, prompt library, undo/rollback, usage tracking, and export/share when you want to save or show your work.

It is intentionally a sandbox: a place to try ideas, break things safely, and learn how models and knowledge systems behave before you ship them elsewhere.

---

## How to use it

### 1. Run the app

**Local development**

```bash
git clone https://github.com/santhosh-patel/Agent-Sandbox.git
cd Agent-Sandbox
npm install
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) for Chat, or [http://localhost:5173/rag](http://localhost:5173/rag) for the RAG Sandbox.

**Production build**

```bash
npm run build
npm run preview
```

Serve the `dist/` folder with any static host if you want a deployed copy.

### 2. Set up Chat

1. Open **Settings** (top nav or sidebar).
2. Choose a **provider** and paste your **API key**, then click **Verify**.
3. Select a **model** from the dropdown.
4. Type a message in the composer and press **Send** (or `⌘Enter` / `Ctrl+Enter`).

From there you can attach images, run **compare mode** across models, save prompts to the library, export chats, and share read-only links.

### 3. Set up RAG Sandbox

1. Navigate to **RAG Sandbox** from the top bar (or go to `/rag`).
2. Create or select a **knowledge base** (default collection: `defaultKB`).
3. **Upload documents** (PDF, DOCX, TXT, Markdown) and wait for indexing.
4. Adjust **retrieval settings** in the settings panel as needed.
5. Ask questions in the RAG chat — responses are grounded on your uploaded content.

Chat and RAG share the same shell and theme. Credentials for each area are stored separately per provider.

### 4. Learn as you go

Press **`?`** inside the app for keyboard shortcuts and built-in help. Tooltips on controls explain common actions without blocking the UI.

---

## What’s included

| Area | Highlights |
|------|------------|
| **Chat** | Streaming, images, compare mode, prompt library, folders, pin/archive, export & share |
| **RAG Sandbox** | Document upload, chunking, embeddings, retrieval tuning, eval mode, collection management |
| **Safety & UX** | Confirmations before destructive actions, undo / roll back (`⌘Z` / `Ctrl+Z`), resizable panels |
| **Usage** | In-app dashboard with estimated token usage and costs (Chat / RAG tabs) |
| **Privacy** | Client-side only — no signup, no Agent Sandbox server |

---

## Supported providers

OpenRouter, OpenAI, Anthropic, Gemini, Groq, and DeepSeek.

OpenRouter is recommended for in-browser use. Anthropic may require a CORS proxy when calling the API directly from the browser.

---

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

---

## Development

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm test` | Run Vitest unit tests |

```
src/
  app.js              Router and shared shell
  playground-app.js     Chat view bootstrap
  state.js              Chat state and undo stack
  ui/                   Chat, sidebar, settings, tooltips, modals, usage panel
  rag/                  RAG state, chunker, retriever, providers
  usage/                Usage data load, render, export
  providers/            LLM provider registry
  shared/               Branding and shared utilities
  styles/               index.css, sorin-theme.css
```

---

## Contributing

Contributions are welcome.

1. [Fork](https://github.com/santhosh-patel/Agent-Sandbox/fork) the repository and clone your fork.
2. Create a branch: `git checkout -b feat/my-change`
3. Make focused changes and run `npm test` (and `npm run build` if UI or build config changed).
4. Open a pull request against `main` with a clear summary and test plan.

Report bugs or suggest features via [GitHub Issues](https://github.com/santhosh-patel/Agent-Sandbox/issues). Include steps to reproduce, expected vs. actual behavior, and browser/OS when relevant.

Please keep the project client-side by default, and never commit API keys, `.env` files, or personal chat exports.
