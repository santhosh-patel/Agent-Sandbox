import { APP_NAME, APP_TAGLINE } from '../shared/branding.js';
import { modKeyLabel } from './icons.js';

const DOC_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'quick-start', label: 'Quick start' },
  { id: 'providers', label: 'Providers' },
  { id: 'features', label: 'Features' },
  { id: 'chat-management', label: 'Chat management' },
  { id: 'export', label: 'Export & sharing' },
  { id: 'privacy', label: 'Privacy & data' },
  { id: 'shortcuts', label: 'Keyboard shortcuts' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

export class HelpUI {
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
            <h2 id="help-panel-title">${APP_NAME}</h2>
            <p class="help-docs-lead">${APP_TAGLINE}</p>
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
                ${APP_NAME} is a browser-based workspace for experimenting with large language models, agents, and knowledge systems.
                Bring your own provider API keys, switch models instantly, compare outputs, and keep a local
                history of conversations — all without creating an account or sending data through a backend server.
              </p>
              <div class="help-callout help-callout--tip">
                <strong>Tip</strong>
                <p>Pick any supported provider in Settings, add your API key, and choose a model — you can switch providers anytime without losing chat history.</p>
              </div>
            </section>

            <section class="help-doc-section" id="help-quick-start">
              <h3>Quick start</h3>
              <ol class="help-doc-steps">
                <li>
                  <span class="help-step-title">Choose a provider</span>
                  <p>Open <strong>Settings</strong> from the top nav or sidebar and select the provider you want to use.</p>
                </li>
                <li>
                  <span class="help-step-title">Add your API key</span>
                  <p>Paste your key and click <strong>Verify</strong>. Keys are stored only in your browser's local storage.</p>
                </li>
                <li>
                  <span class="help-step-title">Pick a model</span>
                  <p>Choose a model from the dropdown. The status pill in the top bar shows your current provider and model.</p>
                </li>
                <li>
                  <span class="help-step-title">Send a message</span>
                  <p>Type in the composer at the bottom and press <kbd>Enter</kbd> or click <strong>Send</strong>.</p>
                </li>
              </ol>
            </section>

            <section class="help-doc-section" id="help-providers">
              <h3>Providers</h3>
              <p>Supported providers and typical use cases:</p>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table">
                  <thead>
                    <tr><th>Provider</th><th>Best for</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><strong>OpenRouter</strong></td><td>Access many models through one API key</td></tr>
                    <tr><td><strong>OpenAI</strong></td><td>GPT-4o, o-series, vision models</td></tr>
                    <tr><td><strong>Anthropic</strong></td><td>Claude — may need a CORS proxy in browser</td></tr>
                    <tr><td><strong>Google Gemini</strong></td><td>Fast multimodal models</td></tr>
                    <tr><td><strong>Groq</strong></td><td>Ultra-fast open models (Llama, Mixtral)</td></tr>
                    <tr><td><strong>DeepSeek</strong></td><td>Reasoning and coding models</td></tr>
                  </tbody>
                </table>
              </div>
              <p class="help-doc-note">
                Provider chips in the footer jump directly to Settings with that provider pre-selected.
              </p>
            </section>

            <section class="help-doc-section" id="help-features">
              <h3>Features</h3>
              <div class="help-feature-grid">
                <article class="help-feature-card">
                  <h4>Compare mode</h4>
                  <p>Enable in Settings, select up to <strong>3 models</strong>, and send one prompt. Responses appear side by side — pick a winner to keep.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Prompt library</h4>
                  <p>Save prompts from the composer or build a library in the sidebar. Search and reuse across chats.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Vision / images</h4>
                  <p>Attach or paste images into the composer on models that support vision input.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Reasoning mode</h4>
                  <p>Toggle reasoning in Settings for models that expose chain-of-thought. Expand thinking blocks in responses.</p>
                </article>
                <article class="help-feature-card">
                  <h4>Parameter presets</h4>
                  <p>Creative, Precise, Coding, and more — quick temperature and token presets in Settings.</p>
                </article>
                <article class="help-feature-card">
                  <h4>PWA install</h4>
                  <p>Install from the browser prompt for home-screen access and offline shell loading.</p>
                </article>
              </div>
            </section>

            <section class="help-doc-section" id="help-chat-management">
              <h3>Chat management</h3>
              <ul class="help-doc-list">
                <li><strong>New chat</strong> — sidebar button or <kbd>${mod}</kbd><kbd>Shift</kbd><kbd>N</kbd></li>
                <li><strong>Search</strong> — filter by title or message content in the sidebar search box</li>
                <li><strong>Pin / Archive</strong> — use the <strong>⋯</strong> menu on any chat; filter with All / Pinned / Archive tabs</li>
                <li><strong>Rename</strong> — click the chat title or use the ⋯ menu</li>
                <li><strong>Folders</strong> — move chats into folders from the ⋯ menu</li>
                <li><strong>Regenerate / Edit</strong> — action buttons on each assistant or user message</li>
              </ul>
            </section>

            <section class="help-doc-section" id="help-export">
              <h3>Export & sharing</h3>
              <p>From any chat's <strong>⋯</strong> menu in the sidebar:</p>
              <ul class="help-doc-list">
                <li><strong>Export Markdown</strong> — download a <code>.md</code> file of the conversation</li>
                <li><strong>Copy share link</strong> — encode the chat in a URL (recipient opens in their browser)</li>
                <li><strong>Export HTML</strong> — standalone readable HTML file</li>
              </ul>
              <p>Import and export all chats or settings from <strong>Settings → Data</strong>.</p>
            </section>

            <section class="help-doc-section" id="help-privacy">
              <h3>Privacy & data</h3>
              <p>
                Everything runs client-side. Chats, API keys, usage stats, and settings live in
                <code>localStorage</code> on your device. Messages go directly from your browser to the
                provider you configure — this app has no server that stores your conversations.
              </p>
              <div class="help-callout help-callout--note">
                <strong>Note</strong>
                <p>Clear all data anytime under Settings → Data. Share links encode chat content in the URL — only share if you are comfortable with that.</p>
              </div>
            </section>

            <section class="help-doc-section" id="help-shortcuts">
              <h3>Keyboard shortcuts</h3>
              <div class="help-doc-table-wrap">
                <table class="help-doc-table help-doc-table--shortcuts">
                  <thead>
                    <tr><th>Shortcut</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    <tr><td><kbd>/</kbd></td><td>Focus message input</td></tr>
                    <tr><td><kbd>${mod}</kbd> <kbd>K</kbd></td><td>Search chats</td></tr>
                    <tr><td><kbd>${mod}</kbd> <kbd>,</kbd></td><td>Toggle settings panel</td></tr>
                    <tr><td><kbd>${mod}</kbd> <kbd>Shift</kbd> <kbd>N</kbd></td><td>New chat</td></tr>
                    <tr><td><kbd>${mod}</kbd> <kbd>Enter</kbd></td><td>Send message</td></tr>
                    <tr><td><kbd>Shift</kbd> <kbd>Enter</kbd></td><td>New line in composer</td></tr>
                    <tr><td><kbd>Esc</kbd></td><td>Close panels / stop generation</td></tr>
                    <tr><td><kbd>?</kbd></td><td>Quick shortcuts reference</td></tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section class="help-doc-section" id="help-troubleshooting">
              <h3>Troubleshooting</h3>
              <dl class="help-doc-faq">
                <dt>API key verification fails</dt>
                <dd>Check the key is correct and has credits. For Anthropic in-browser, set a CORS proxy URL in Settings.</dd>
                <dt>No models in dropdown</dt>
                <dd>Click <strong>Refresh</strong> after verifying your key. Some providers require a valid key before listing models.</dd>
                <dt>Streaming stops or errors mid-response</dt>
                <dd>Provider rate limits or network issues. Retry with the error action, or try a smaller max-tokens value.</dd>
                <dt>Data disappeared</dt>
                <dd>Browser storage may have been cleared. Export chats regularly from Settings → Data.</dd>
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
