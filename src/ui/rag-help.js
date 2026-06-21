import { modKeyLabel } from './icons.js';

const DOC_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'interface', label: 'Interface' },
  { id: 'knowledge-bases', label: 'Knowledge bases' },
  { id: 'documents', label: 'Documents' },
  { id: 'indexing', label: 'Indexing & chunking' },
  { id: 'embeddings', label: 'Embeddings' },
  { id: 'retrieval', label: 'Retrieval' },
  { id: 'eval', label: 'Eval pipeline' },
  { id: 'chat', label: 'RAG chat' },
  { id: 'settings', label: 'Pipeline settings' },
  { id: 'providers', label: 'Providers' },
  { id: 'import-export', label: 'Import & export' },
  { id: 'privacy', label: 'Privacy & data' },
  { id: 'shortcuts', label: 'Shortcuts' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

export class RagHelpUI {
  constructor() {
    this.panel = null;
    this.onKeydown = this.onKeydown.bind(this);
    this.onTocClick = this.onTocClick.bind(this);
  }

  togglePanel() {
    if (this.panel?.classList.contains('visible')) {
      this.closePanel();
    } else {
      this.openPanel();
    }
  }

  openPanel() {
    if (this.panel) this.panel.remove();

    const mod = modKeyLabel();
    this.panel = document.createElement('div');
    this.panel.className = 'help-panel visible';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', 'help-panel-title');
    this.panel.innerHTML = `
      <div class="help-content help-docs">
        <header class="help-docs-header">
          <div class="help-docs-header-text">
            <p class="help-docs-eyebrow">Documentation</p>
            <h2 id="help-panel-title">RAG Sandbox</h2>
            <p class="help-docs-lead">Build, test, and tune retrieval-augmented generation pipelines entirely in your browser.</p>
          </div>
          <button type="button" class="btn-text help-close" aria-label="Close documentation">Close</button>
        </header>

        <div class="help-docs-layout">
          <nav class="help-docs-toc" aria-label="Documentation sections">
            ${DOC_SECTIONS.map(s => `
              <a href="#help-${s.id}" class="help-docs-toc-link" data-section="${s.id}">${s.label}</a>
            `).join('')}
          </nav>

          <div class="help-docs-main">
            <section class="help-doc-section" id="help-overview">
              <h3>Overview</h3>
              <p>
                RAG Sandbox is a client-side workspace for testing retrieval-augmented generation (RAG).
                Upload documents into knowledge bases, chunk and embed them with your own API keys,
                retrieve relevant passages at query time, and chat with a model grounded on that context.
              </p>
              <p>
                The full pipeline runs in your browser: parsing, chunking, embedding, vector search,
                prompt assembly, and chat completion. Nothing is sent to an application backend — only
                to the LLM and embedding providers you configure.
              </p>
              <div class="help-callout help-callout--tip">
                <strong>Tip</strong>
                <p>Open RAG Sandbox from the main Agent Sandbox top bar, or return anytime via the <strong>Agent Sandbox</strong> pill. Theme preference is shared between both apps.</p>
              </div>
              <h4>What you can do</h4>
              <ul class="help-doc-list">
                <li>Manage multiple <strong>knowledge base collections</strong> with separate documents and chat history</li>
                <li>Upload <strong>PDF, DOCX, TXT, and Markdown</strong> files (drag-and-drop supported)</li>
                <li>Tune <strong>chunking</strong>, <strong>embedding models</strong>, and <strong>retrieval</strong> parameters</li>
                <li>Use different providers for <strong>embeddings</strong> and <strong>chat</strong></li>
                <li>Inspect <strong>retrieved chunks</strong>, similarity scores, and the exact context sent to the model</li>
                <li>Track <strong>tokens, cost, and latency</strong> per session</li>
                <li><strong>Import and export</strong> collections as JSON for backup or sharing</li>
              </ul>
            </section>

            <section class="help-doc-section" id="help-quick-start">
              <h3>Quick start</h3>
              <ol class="help-doc-steps">
                <li>
                  <span class="help-step-title">Open the menu sidebar</span>
                  <p>Click <strong>Menu</strong> in the top nav (or the mobile header) to show knowledge bases and documents.</p>
                </li>
                <li>
                  <span class="help-step-title">Upload documents</span>
                  <p>Under <strong>Docs</strong>, click <strong>Upload documents</strong> or drag files onto the upload zone. Supported: PDF, DOCX, TXT, Markdown.</p>
                </li>
                <li>
                  <span class="help-step-title">Configure embeddings</span>
                  <p>Open <strong>Settings</strong> → <strong>Embeddings</strong>. Pick a provider, paste an API key, choose a model, and click <strong>Verify</strong>.</p>
                </li>
                <li>
                  <span class="help-step-title">Configure chat</span>
                  <p>In <strong>Chat Model</strong>, pick a provider, API key, and model. Verify the key and refresh models if needed.</p>
                </li>
                <li>
                  <span class="help-step-title">Wait for indexing</span>
                  <p>Each document is chunked and embedded automatically. Status shows <em>pending</em> → <em>indexing</em> → <em>indexed</em>.</p>
                </li>
                <li>
                  <span class="help-step-title">Ask a question</span>
                  <p>Type in the chat composer and press <kbd>Enter</kbd> or click the send button. Answers use retrieved context from your docs.</p>
                </li>
              </ol>
            </section>

            <section class="help-doc-section" id="help-interface">
              <h3>Interface</h3>
              <p>RAG Sandbox uses the same shell layout as Agent Sandbox:</p>
              <div class="help-feature-grid">
                <article class="help-feature-card">
                  <h4>Left sidebar (Menu)</h4>
                  <p>Knowledge base collections, document upload, import/export, and reindex. Toggle with <strong>Menu</strong> in the top nav or the mobile <strong>Menu</strong> button.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Center — RAG Chat</h4>
                  <p>Conversation with your knowledge base. Shows session usage (requests, tokens, cost, average latency) and <strong>Clear chat</strong>.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Right panel (Settings)</h4>
                  <p>Pipeline settings: embeddings, chat model, chunking, retrieval, prompts, and advanced parameters. Toggle with <strong>Settings</strong> in the top nav.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Top navigation</h4>
                  <p><strong>Menu</strong>, <strong>Settings</strong>, and <strong>Help</strong> pills. Theme toggle and link back to Agent Sandbox on the right.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Edge toggles</h4>
                  <p>On desktop, small arrow buttons on the left and right edges collapse or expand the sidebar and settings panel.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Mobile</h4>
                  <p>Below 768px the top nav hides; use the mobile header for Menu, Settings, and Help. Panels slide in as overlays.</p>
                </article>
              </div>
            </section>

            <section class="help-doc-section" id="help-knowledge-bases">
              <h3>Knowledge bases</h3>
              <p>
                Each <strong>knowledge base</strong> (collection) is an isolated set of documents with its own chunks,
                embeddings, and chat history. Switching collections clears the current chat and loads that base's context.
              </p>
              <ul class="help-doc-list">
                <li><strong>New collection</strong> — click <strong>+</strong> next to Knowledge Bases; enter a name</li>
                <li><strong>Select</strong> — click a collection in the list; active collection is highlighted</li>
                <li><strong>Rename / delete</strong> — use the edit (✎) and delete (×) buttons on each collection row</li>
                <li><strong>Document count</strong> — shown beside each collection name</li>
              </ul>
              <p>
                Document content and embedding vectors are stored in <strong>IndexedDB</strong> (<code>rag-sandbox-db</code>).
                Settings, eval sets, and chat messages stay in <code>localStorage</code> under <code>rag-sandbox-state</code>.
              </p>
            </section>

            <section class="help-doc-section" id="help-documents">
              <h3>Documents</h3>
              <h4>Supported formats</h4>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table">
                  <thead>
                    <tr><th>Format</th><th>Extensions</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Plain text</strong></td><td><code>.txt</code></td><td>Direct text read</td></tr>
                    <tr><td><strong>Markdown</strong></td><td><code>.md</code>, <code>.markdown</code></td><td>Treated as plain text for chunking</td></tr>
                    <tr><td><strong>PDF</strong></td><td><code>.pdf</code></td><td>Text extracted per page via PDF.js</td></tr>
                    <tr><td><strong>Word</strong></td><td><code>.docx</code></td><td>Converted to text via Mammoth</td></tr>
                  </tbody>
                </table>
              </div>
              <h4>Upload</h4>
              <ul class="help-doc-list">
                <li>Click <strong>Upload documents</strong> or drop files on the upload zone</li>
                <li>Multiple files can be uploaded at once</li>
                <li>Each file becomes a document in the active collection</li>
              </ul>
              <h4>Document list</h4>
              <ul class="help-doc-list">
                <li><strong>Name</strong> and <strong>chunk count</strong> plus file size</li>
                <li><strong>Status</strong> — <em>pending</em>, <em>indexing</em>, <em>indexed</em>, or <em>error</em></li>
                <li><strong>Delete</strong> — remove button (×) with confirmation; removes document and all its chunks</li>
              </ul>
              <h4>Collection actions</h4>
              <ul class="help-doc-list">
                <li><strong>Import</strong> — load a collection from a JSON file exported earlier</li>
                <li><strong>Export</strong> — download the active collection as JSON (documents, chunks, embeddings)</li>
                <li><strong>Reindex</strong> — re-chunk and re-embed every document in the active collection (use after changing chunk or embedding settings)</li>
              </ul>
            </section>

            <section class="help-doc-section" id="help-indexing">
              <h3>Indexing & chunking</h3>
              <p>
                After upload, each document is split into <strong>chunks</strong>, then each chunk is sent to your
                embedding provider to produce a vector. Indexed chunks are stored with the document in local storage.
              </p>
              <h4>Chunk strategies</h4>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table">
                  <thead>
                    <tr><th>Strategy</th><th>Behavior</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Recursive</strong> (default)</td><td>Splits by paragraphs and sentences, then fixed-size fallback for long segments. Best general-purpose choice.</td></tr>
                    <tr><td><strong>Sentence</strong></td><td>Groups sentences up to chunk size; long sentences are split further.</td></tr>
                    <tr><td><strong>Fixed</strong></td><td>Character-length windows with overlap; predictable sizes, may break mid-sentence.</td></tr>
                  </tbody>
                </table>
              </div>
              <h4>Chunk parameters</h4>
              <ul class="help-doc-list">
                <li><strong>Chunk size</strong> — target characters per chunk (default 512; range 100–4000)</li>
                <li><strong>Overlap</strong> — characters shared between consecutive chunks (default 50) to preserve context across boundaries</li>
              </ul>
              <div class="help-callout help-callout--note">
                <strong>Note</strong>
                <p>Changing chunk size, overlap, or strategy does not automatically re-index existing documents. Click <strong>Reindex</strong> after tuning chunking settings.</p>
              </div>
            </section>

            <section class="help-doc-section" id="help-embeddings">
              <h3>Embeddings</h3>
              <p>
                Embeddings turn text into numeric vectors so similar content scores highly in search.
                RAG Sandbox uses your chosen embedding provider and model for both document chunks and query embedding at chat time.
              </p>
              <ul class="help-doc-list">
                <li><strong>Provider</strong> — must support embeddings (OpenAI, Gemini, OpenRouter, Mistral, Cohere, Voyage AI)</li>
                <li><strong>API key</strong> — stored locally per provider in RAG state; separate from main Chat keys</li>
                <li><strong>Model</strong> — e.g. <code>text-embedding-3-small</code>, <code>mistral-embed</code>, <code>voyage-3</code></li>
                <li><strong>Verify</strong> — tests the key against the provider API</li>
              </ul>
              <p>
                Embedding calls are batched during indexing. Cost estimates use published per-million-token rates where available.
                Failed embedding calls mark the document as <em>error</em>.
              </p>
            </section>

            <section class="help-doc-section" id="help-retrieval">
              <h3>Retrieval</h3>
              <p>When you send a chat message, the pipeline:</p>
              <ol class="help-doc-list">
                <li>Embeds your question with the same embedding model</li>
                <li>Compares the query vector to all indexed chunks in the active collection</li>
                <li>Ranks chunks by similarity and filters by threshold</li>
                <li>Builds a context block from the top results (configurable character limit, default 8000)</li>
                <li>Injects context into the RAG prompt template and sends it to the chat model</li>
              </ol>
              <h4>Retrieval settings</h4>
              <ul class="help-doc-list">
                <li><strong>Top K</strong> — maximum chunks returned (1–20, default 5)</li>
                <li><strong>Similarity threshold</strong> — minimum score to include a chunk (0–1, default 0.30)</li>
                <li><strong>Search strategy</strong> — <em>Cosine similarity</em> (default), <em>Dot product</em>, or <em>Euclidean distance</em> (converted to a 0–1 score)</li>
                <li><strong>Context window (chars)</strong> — max characters injected into the RAG prompt from retrieved chunks</li>
                <li><strong>Document scope</strong> — optionally limit retrieval to specific indexed documents (empty = all)</li>
              </ul>
              <h4>Inspecting retrieval</h4>
              <p>Each assistant reply can show:</p>
              <ul class="help-doc-list">
                <li><strong>Retrieved chunks</strong> — source document, chunk index, similarity score, and text preview</li>
                <li><strong>Context sent to LLM</strong> — expandable block with the full context string passed to the model</li>
                <li><strong>Message meta</strong> — latency, token usage, and estimated cost for that reply</li>
              </ul>
              <div class="help-callout help-callout--tip">
                <strong>Tip</strong>
                <p>If answers miss relevant info, try lowering the similarity threshold, increasing Top K, or using smaller chunks with more overlap.</p>
              </div>
            </section>

            <section class="help-doc-section" id="help-eval">
              <h3>Eval pipeline</h3>
              <p>
                The sidebar <strong>Evaluation</strong> panel lets you batch-test retrieval without calling the chat model.
                Use it to tune Top K, similarity threshold, chunking, and document scope before chatting.
              </p>
              <ul class="help-doc-list">
                <li><strong>+ Question</strong> — add a test query; optional expected keywords for keyword-hit scoring</li>
                <li><strong>Import</strong> — load questions from a JSON eval set</li>
                <li><strong>Run batch</strong> — embeds each question, runs retrieval, and scores results</li>
                <li><strong>JSON / Report</strong> — export full eval history or a Markdown report of the latest run</li>
              </ul>
              <p>
                Results show top similarity score, source document, latency, and keyword hit percentage.
                Recent runs compare avg score against the previous run for the same collection.
              </p>
            </section>

            <section class="help-doc-section" id="help-chat">
              <h3>RAG chat</h3>
              <p>
                The chat composer sends questions through the full RAG pipeline. Responses are rendered as Markdown.
                Streaming is supported where the chat provider allows it.
              </p>
              <ul class="help-doc-list">
                <li><strong>Enter</strong> — send message</li>
                <li><strong>Shift + Enter</strong> — new line in the composer</li>
                <li><strong>Stop</strong> — appears while generating; cancels the in-flight request</li>
                <li><strong>Clear chat</strong> — removes all messages for the active collection (does not delete documents)</li>
              </ul>
              <h4>Prompts</h4>
              <ul class="help-doc-list">
                <li><strong>System prompt</strong> — instructions for the chat model (behavior, tone, citation rules)</li>
                <li><strong>RAG prompt template</strong> — must include <code>{context}</code> and <code>{question}</code> placeholders; defines how retrieved text and the user question are combined</li>
              </ul>
              <h4>Session stats</h4>
              <p>The chat header shows cumulative <strong>requests</strong>, <strong>tokens</strong>, <strong>estimated cost</strong>, and <strong>average latency</strong> for the current browser session.</p>
            </section>

            <section class="help-doc-section" id="help-settings">
              <h3>Pipeline settings</h3>
              <p>All pipeline settings live in the right <strong>Pipeline Settings</strong> panel:</p>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table">
                  <thead>
                    <tr><th>Section</th><th>Options</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>Embeddings</strong></td><td>Provider, API key, model, verify</td></tr>
                    <tr><td><strong>Chat Model</strong></td><td>Provider, API key, model list refresh, verify</td></tr>
                    <tr><td><strong>Chunking</strong></td><td>Chunk size, overlap, strategy</td></tr>
                    <tr><td><strong>Retrieval</strong></td><td>Top K, similarity threshold, search strategy, context window, document scope</td></tr>
                    <tr><td><strong>Prompts</strong></td><td>System prompt, RAG template</td></tr>
                    <tr><td><strong>Advanced</strong></td><td>CORS proxy URL, temperature (0–2), max tokens (256–32000)</td></tr>
                  </tbody>
                </table>
              </div>
              <p>Settings are saved automatically to <code>localStorage</code> when changed. API keys are stored per provider ID in RAG state.</p>
            </section>

            <section class="help-doc-section" id="help-providers">
              <h3>Providers</h3>
              <p>Embedding and chat providers can be mixed — for example, Voyage embeddings with OpenAI chat.</p>
              <h4>Embedding providers</h4>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table">
                  <thead>
                    <tr><th>Provider</th><th>Example models</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>OpenAI</strong></td><td>text-embedding-3-small, text-embedding-3-large</td></tr>
                    <tr><td><strong>Google Gemini</strong></td><td>text-embedding-004, embedding-001</td></tr>
                    <tr><td><strong>OpenRouter</strong></td><td>OpenAI embedding models via one key</td></tr>
                    <tr><td><strong>Mistral</strong></td><td>mistral-embed</td></tr>
                    <tr><td><strong>Cohere</strong></td><td>embed-english-v3.0, embed-multilingual-v3.0</td></tr>
                    <tr><td><strong>Voyage AI</strong></td><td>voyage-3, voyage-3-lite, voyage-code-3 (embeddings only)</td></tr>
                  </tbody>
                </table>
              </div>
              <h4>Chat providers</h4>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table">
                  <thead>
                    <tr><th>Provider</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>OpenAI</strong></td><td>GPT-4o, GPT-4o mini, and related models</td></tr>
                    <tr><td><strong>Anthropic</strong></td><td>Claude models; may require CORS proxy in browser</td></tr>
                    <tr><td><strong>Google Gemini</strong></td><td>Gemini Flash and Pro variants</td></tr>
                    <tr><td><strong>OpenRouter</strong></td><td>Many models through a single API key</td></tr>
                    <tr><td><strong>Groq</strong></td><td>Fast Llama models (chat only, no embeddings)</td></tr>
                    <tr><td><strong>DeepSeek</strong></td><td>Chat and reasoner models</td></tr>
                    <tr><td><strong>Mistral</strong></td><td>Mistral Small / Large</td></tr>
                    <tr><td><strong>Cohere</strong></td><td>Command R and Command R+</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="help-doc-note">
                Use <strong>Get key</strong> links next to API key fields to open each provider's key management page.
                Click <strong>Refresh</strong> on the chat model row after verifying a key to load the full model list.
              </p>
            </section>

            <section class="help-doc-section" id="help-import-export">
              <h3>Import & export</h3>
              <h4>Export collection</h4>
              <p>
                Downloads a JSON file containing the collection name, documents, extracted text, chunks,
                embeddings, and metadata. Use for backup or moving data between browsers (import on the other side).
              </p>
              <h4>Import collection</h4>
              <p>
                Loads a previously exported JSON file as a new collection in your sandbox. Imported collections
                do not replace the active one unless you select them after import.
              </p>
              <div class="help-callout help-callout--note">
                <strong>Note</strong>
                <p>Exported JSON includes embedding vectors and can be large. Store and share exports carefully — they contain your document content.</p>
              </div>
            </section>

            <section class="help-doc-section" id="help-privacy">
              <h3>Privacy & data</h3>
              <p>
                RAG Sandbox runs entirely client-side. Document text, chunk embeddings, chat messages, API keys,
                and settings are stored in <code>localStorage</code> on your device under <code>rag-sandbox-state</code>.
              </p>
              <p>Network requests go only to:</p>
              <ul class="help-doc-list">
                <li>Your configured <strong>embedding provider</strong> (indexing and query embedding)</li>
                <li>Your configured <strong>chat provider</strong> (completion)</li>
              </ul>
              <p>
                There is no application server that stores your documents or conversations. Clearing browser data
                for this site removes all RAG Sandbox state. Export collections regularly if you need backups.
              </p>
              <p>
                API keys in RAG Sandbox are separate from Agent Sandbox keys, even when using the same provider.
              </p>
            </section>

            <section class="help-doc-section" id="help-shortcuts">
              <h3>Shortcuts</h3>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table help-doc-table--shortcuts">
                  <thead>
                    <tr><th>Shortcut</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><kbd>Enter</kbd></td><td>Send chat message</td></tr>
                    <tr><td><kbd>Shift</kbd> <kbd>Enter</kbd></td><td>New line in composer</td></tr>
                    <tr><td><kbd>Esc</kbd></td><td>Close Help panel or stop generation</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="help-doc-note">
                Main Agent Sandbox shortcuts (<kbd>${mod}</kbd><kbd>,</kbd> for settings, etc.) apply to the shared shell patterns where panels are open.
              </p>
            </section>

            <section class="help-doc-section" id="help-troubleshooting">
              <h3>Troubleshooting</h3>
              <dl class="help-doc-faq">
                <dt>Documents stuck on pending or indexing</dt>
                <dd>Check embedding API key and model. Open browser devtools console for errors. Try <strong>Reindex</strong> after fixing the key.</dd>
                <dt>Document shows error status</dt>
                <dd>Embedding failed — verify key, model name, and provider credits. Re-upload or reindex after fixing.</dd>
                <dt>No relevant answers / empty retrieval</dt>
                <dd>Lower similarity threshold, increase Top K, or reindex with smaller chunks. Ensure documents finished indexing.</dd>
                <dt>Chat verify fails</dt>
                <dd>Confirm chat provider key and model. Refresh model list. For Anthropic in-browser, a CORS proxy may be required (same limitation as Chat).</dd>
                <dt>PDF or DOCX parse issues</dt>
                <dd>Scanned PDFs without text layers may extract poorly. Complex DOCX layouts may lose formatting (text only is preserved).</dd>
                <dt>Reindex after settings change</dt>
                <dd>Chunk size, overlap, strategy, or embedding model changes require <strong>Reindex</strong> to apply to existing documents.</dd>
                <dt>Data lost after browser cleanup</dt>
                <dd>Export collections regularly. RAG state is not synced to the Chat view.</dd>
                <dt>High cost during indexing</dt>
                <dd>Large files produce many chunks; each chunk is embedded. Start with smaller test documents when tuning settings.</dd>
              </dl>
            </section>
          </div>
        </div>
      </div>
    `;

    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.closePanel();
    });
    this.panel.querySelector('.help-close').addEventListener('click', () => this.closePanel());
    this.panel.querySelectorAll('.help-docs-toc-link').forEach(link => {
      link.addEventListener('click', this.onTocClick);
    });
    this.panel.querySelector('.help-docs-toc-link')?.classList.add('active');

    document.addEventListener('keydown', this.onKeydown);
    document.body.appendChild(this.panel);
  }

  onTocClick(e) {
    e.preventDefault();
    const href = e.currentTarget.getAttribute('href');
    const id = href?.slice(1);
    const target = id ? this.panel?.querySelector(`#${id}`) : null;
    const main = this.panel?.querySelector('.help-docs-main');
    if (target && main) {
      const mainRect = main.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      main.scrollTo({
        top: main.scrollTop + (targetRect.top - mainRect.top) - 8,
        behavior: 'smooth',
      });
      this.panel.querySelectorAll('.help-docs-toc-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === href);
      });
    }
  }

  onKeydown(e) {
    if (e.key === 'Escape' && this.panel?.classList.contains('visible')) {
      e.preventDefault();
      this.closePanel();
    }
  }

  closePanel() {
    document.removeEventListener('keydown', this.onKeydown);
    if (!this.panel) return;
    this.panel.classList.remove('visible');
    setTimeout(() => {
      this.panel?.remove();
      this.panel = null;
    }, 200);
  }
}
