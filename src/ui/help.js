import { modKeyLabel } from './icons.js';

export class HelpUI {
  constructor() {
    this.panel = null;
    this.onKeydown = this.onKeydown.bind(this);
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
      <div class="help-content">
        <div class="help-header">
          <h2 id="help-panel-title">Help</h2>
          <button type="button" class="btn-text help-close" aria-label="Close help">Close</button>
        </div>
        <div class="help-body">
          <section class="help-section">
            <h3>About AI Playground</h3>
            <p>
              AI Playground is a private, browser-based workspace for testing large language models.
              Connect your own API keys, chat with any supported model, compare responses side by side,
              and keep everything on your device — no account and no backend server required.
            </p>
          </section>

          <section class="help-section">
            <h3>Getting started</h3>
            <ol class="help-steps">
              <li>Open <strong>Settings</strong> and choose a provider. OpenRouter is recommended for in-browser use with a single key.</li>
              <li>Paste your API key and click <strong>Verify</strong>.</li>
              <li>Select a model, then type a message and press <strong>Send</strong>.</li>
            </ol>
          </section>

          <section class="help-section">
            <h3>Features</h3>
            <ul class="help-list">
              <li><strong>Multi-provider</strong> — OpenRouter, OpenAI, Anthropic, Gemini, Groq, and DeepSeek</li>
              <li><strong>Compare mode</strong> — run up to 3 models on the same prompt and pick a winner</li>
              <li><strong>Prompt library</strong> — save and reuse your best prompts across chats</li>
              <li><strong>Images</strong> — attach or paste images on vision-capable models</li>
              <li><strong>Chat organization</strong> — pin, archive, rename, search, and export conversations</li>
              <li><strong>Export</strong> — download Markdown, share a link, or export HTML from a chat’s menu</li>
              <li><strong>Themes</strong> — light, dark, or system appearance from the sidebar</li>
              <li><strong>Installable</strong> — add to your home screen as a PWA for quick access</li>
            </ul>
          </section>

          <section class="help-section">
            <h3>Privacy</h3>
            <p>
              Chats, API keys, and settings are stored in your browser’s local storage only.
              Messages are sent directly from your browser to the provider you choose.
              Clear all data anytime from Settings → Data.
            </p>
          </section>

          <section class="help-section">
            <h3>Keyboard shortcuts</h3>
            <div class="help-shortcuts">
              <div class="shortcut-row"><kbd>/</kbd><span>Focus message input</span></div>
              <div class="shortcut-row"><kbd>${mod}</kbd><kbd>K</kbd><span>Search chats</span></div>
              <div class="shortcut-row"><kbd>${mod}</kbd><kbd>,</kbd><span>Toggle settings</span></div>
              <div class="shortcut-row"><kbd>${mod}</kbd><kbd>Shift</kbd><kbd>N</kbd><span>New chat</span></div>
              <div class="shortcut-row"><kbd>${mod}</kbd><kbd>Enter</kbd><span>Send message</span></div>
              <div class="shortcut-row"><kbd>Esc</kbd><span>Close panels / stop generation</span></div>
              <div class="shortcut-row"><kbd>?</kbd><span>Show shortcuts</span></div>
            </div>
          </section>
        </div>
      </div>
    `;

    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.closePanel();
    });
    this.panel.querySelector('.help-close').addEventListener('click', () => this.closePanel());
    document.addEventListener('keydown', this.onKeydown);
    document.body.appendChild(this.panel);
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
