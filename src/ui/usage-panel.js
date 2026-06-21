import {
  renderUsageDashboard,
  exportUsageJson,
  resetUsageStats,
} from '../usage/usage-data.js';
import { showToast } from './toast.js';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'playground', label: 'Playground' },
  { id: 'rag', label: 'RAG' },
];

class UsagePanelUI {
  constructor() {
    this.panel = null;
    this.activeTab = 'all';
    this.onKeydown = this.onKeydown.bind(this);
    this.onStorage = this.onStorage.bind(this);
    this.unsubscribers = [];
  }

  open() {
    if (this.panel?.classList.contains('visible')) {
      this.refresh();
      return;
    }
    this.buildPanel();
    requestAnimationFrame(() => {
      this.panel?.classList.add('visible');
      this.panel?.querySelector('.usage-panel-card')?.classList.add('is-entering');
      this.panel?.querySelector('.usage-refresh-btn')?.focus();
    });
    document.addEventListener('keydown', this.onKeydown);
    window.addEventListener('storage', this.onStorage);
    this.bindLiveUpdates();
    this.refresh();
  }

  close() {
    document.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('storage', this.onStorage);
    this.unsubscribers.forEach(fn => fn());
    this.unsubscribers = [];

    if (!this.panel) return;
    this.panel.classList.remove('visible');
    this.panel.querySelector('.usage-panel-card')?.classList.remove('is-entering');
    setTimeout(() => {
      this.panel?.remove();
      this.panel = null;
    }, 200);
  }

  toggle() {
    if (this.panel?.classList.contains('visible')) this.close();
    else this.open();
  }

  buildPanel() {
    if (this.panel) this.panel.remove();

    this.panel = document.createElement('div');
    this.panel.className = 'usage-panel';
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', 'usage-panel-title');

    this.panel.innerHTML = `
      <div class="usage-panel-card">
        <header class="usage-panel-header">
          <div class="usage-panel-header-text">
            <p class="help-docs-eyebrow">Analytics</p>
            <h2 id="usage-panel-title">Usage Dashboard</h2>
          </div>
          <div class="usage-panel-actions">
            <button type="button" class="btn btn-ghost btn-sm usage-refresh-btn" data-tip="Reload stats from local storage">Refresh</button>
            <button type="button" class="btn btn-ghost btn-sm usage-export-btn" data-tip="Download usage data as JSON">Export JSON</button>
            <button type="button" class="btn btn-danger btn-sm usage-reset-btn" data-tip="Clear usage stats — choose Playground, RAG, or all">Reset…</button>
            <button type="button" class="btn-text usage-close-btn" aria-label="Close usage dashboard" data-tip="Close (Esc)">Close</button>
          </div>
        </header>
        <nav class="usage-tabs" aria-label="Usage sections">
          ${TABS.map(t => `
            <button type="button" class="usage-tab${t.id === this.activeTab ? ' usage-tab--active' : ''}" data-tab="${t.id}"
              data-tip="${t.id === 'all' ? 'Combined Playground and RAG stats' : t.id === 'playground' ? 'Chat token usage and costs' : 'RAG embedding and chat usage'}">${t.label}</button>
          `).join('')}
        </nav>
        <div class="usage-panel-body usage-panel-body--visible" id="usage-panel-body"></div>
      </div>
    `;

    this.panel.querySelector('.usage-close-btn')?.addEventListener('click', () => this.close());
    this.panel.addEventListener('click', (e) => {
      if (e.target === this.panel) this.close();
    });
    this.panel.querySelector('.usage-refresh-btn')?.addEventListener('click', () => this.refresh());
    this.panel.querySelector('.usage-export-btn')?.addEventListener('click', () => exportUsageJson());
    this.panel.querySelector('.usage-reset-btn')?.addEventListener('click', () => this.handleReset());

    this.panel.querySelector('.usage-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.usage-tab');
      if (!tab) return;
      this.setTab(tab.dataset.tab || 'all');
    });

    document.body.appendChild(this.panel);
  }

  async bindLiveUpdates() {
    try {
      const { state } = await import('../state.js');
      this.unsubscribers.push(state.on('usage-updated', () => this.refresh()));
    } catch { /* ignore */ }

    try {
      const { ragState } = await import('../rag/rag-state.js');
      this.unsubscribers.push(ragState.on('usage-changed', () => this.refresh()));
    } catch { /* ignore */ }
  }

  setTab(tabId) {
    if (this.activeTab === tabId) return;
    this.activeTab = tabId;

    this.panel?.querySelectorAll('.usage-tab').forEach(t => {
      t.classList.toggle('usage-tab--active', t.dataset.tab === tabId);
    });

    const body = this.panel?.querySelector('.usage-panel-body');
    if (!body) return;

    body.classList.remove('usage-panel-body--visible');
    setTimeout(() => {
      body.innerHTML = renderUsageDashboard(this.activeTab);
      requestAnimationFrame(() => body.classList.add('usage-panel-body--visible'));
    }, 150);
  }

  refresh() {
    const body = this.panel?.querySelector('#usage-panel-body');
    if (!body) return;
    body.innerHTML = renderUsageDashboard(this.activeTab);
    body.classList.add('usage-panel-body--visible');
  }

  onStorage() {
    if (this.panel?.classList.contains('visible')) this.refresh();
  }

  onKeydown(e) {
    if (e.key === 'Escape' && this.panel?.classList.contains('visible')) {
      e.preventDefault();
      this.close();
    }
  }

  showResetDialog() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay visible';
      overlay.style.zIndex = '400';
      overlay.innerHTML = `
        <div class="modal" role="dialog">
          <h3 class="modal-title">Reset usage statistics</h3>
          <p class="modal-message">Choose which stats to clear. This cannot be undone.</p>
          <div class="modal-actions modal-actions--stack">
            <button type="button" class="btn btn-danger" data-scope="all">Reset all</button>
            <button type="button" class="btn btn-ghost" data-scope="playground">Playground only</button>
            <button type="button" class="btn btn-ghost" data-scope="rag">RAG only</button>
            <button type="button" class="btn btn-ghost modal-cancel">Cancel</button>
          </div>
        </div>
      `;
      const close = (val) => {
        overlay.remove();
        resolve(val);
      };
      overlay.querySelector('.modal-cancel')?.addEventListener('click', () => close(null));
      overlay.querySelectorAll('[data-scope]').forEach(btn => {
        btn.addEventListener('click', () => close(btn.dataset.scope));
      });
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      document.body.appendChild(overlay);
    });
  }

  async handleReset() {
    const scope = await this.showResetDialog();
    const result = resetUsageStats(scope);
    if (result.ok) {
      showToast(`Usage stats reset (${result.scope})`);
      this.refresh();
    } else if (result.error) {
      showToast(`Reset failed: ${result.error}`, { isError: true });
    }
  }
}

export const usagePanel = new UsagePanelUI();
