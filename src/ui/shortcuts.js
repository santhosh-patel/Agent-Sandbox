import { modKeyLabel } from './icons.js';

export class ShortcutsUI {
  constructor(handlers) {
    this.handlers = handlers;
    this.panel = null;
    this.init();
  }

  init() {
    document.addEventListener('keydown', (e) => this.handleKeydown(e));

    const hint = document.getElementById('edge-hint');
    if (hint && !localStorage.getItem('edge-hint-dismissed')) {
      hint.remove();
    }
  }

  handleKeydown(e) {
    const target = e.target;
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

    if (e.key === '?' && !isInput) {
      e.preventDefault();
      this.togglePanel();
      return;
    }

    if (e.key === 'Escape') {
      if (document.querySelector('.help-panel.visible')) return;
      if (this.panel?.classList.contains('visible')) {
        this.closePanel();
        return;
      }
      if (this.handlers.onEscape) this.handlers.onEscape();
      return;
    }

    if (isInput && e.key !== '/') return;

    if (e.key === '/' && !isInput) {
      e.preventDefault();
      if (this.handlers.focusInput) this.handlers.focusInput();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (this.handlers.focusSearch) this.handlers.focusSearch();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      if (this.handlers.toggleSettings) this.handlers.toggleSettings();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      if (this.handlers.newChat) this.handlers.newChat();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      if (this.handlers.send) this.handlers.send();
    }
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

    this.panel = document.createElement('div');
    this.panel.className = 'shortcuts-panel visible';
    const mod = modKeyLabel();
    this.panel.innerHTML = `
      <div class="shortcuts-content">
        <div class="shortcuts-header">
          <h3>Shortcuts</h3>
          <button type="button" class="btn-text shortcuts-close">Close</button>
        </div>
        <div class="shortcuts-list">
          <div class="shortcut-row"><kbd>/</kbd><span>Focus message input</span></div>
          <div class="shortcut-row"><kbd>${mod}</kbd><kbd>K</kbd><span>Search chats</span></div>
          <div class="shortcut-row"><kbd>${mod}</kbd><kbd>,</kbd><span>Toggle settings</span></div>
          <div class="shortcut-row"><kbd>${mod}</kbd><kbd>Shift</kbd><kbd>N</kbd><span>New chat</span></div>
          <div class="shortcut-row"><kbd>${mod}</kbd><kbd>Enter</kbd><span>Send message</span></div>
          <div class="shortcut-row"><kbd>Enter</kbd><span>Send message</span></div>
          <div class="shortcut-row"><kbd>Shift</kbd><kbd>Enter</kbd><span>New line</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd><span>Close panel / stop</span></div>
          <div class="shortcut-row"><kbd>?</kbd><span>Show shortcuts</span></div>
        </div>
      </div>
    `;

    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.closePanel();
    });
    this.panel.querySelector('.shortcuts-close').addEventListener('click', () => this.closePanel());
    document.body.appendChild(this.panel);
  }

  closePanel() {
    if (this.panel) {
      this.panel.classList.remove('visible');
      setTimeout(() => {
        this.panel?.remove();
        this.panel = null;
      }, 200);
    }
  }
}
