import { state } from '../state.js';
import { showPrompt } from './modal.js';
import { showConfirm } from './modal.js';
import { showToast } from './toast.js';
import { iconHtml } from './icons.js';

const PREVIEW_LENGTH = 160;

export class PromptLibraryUI {
  constructor(onUsePrompt) {
    this.onUsePrompt = onUsePrompt;
    this.panel = document.getElementById('prompt-library-panel');
    this.backdrop = document.getElementById('prompt-library-backdrop');
    this.listEl = document.getElementById('prompt-library-list');
    this.countEl = document.getElementById('prompt-library-count');
    this.searchInput = document.getElementById('prompt-library-search');
    this.toggleBtn = document.getElementById('prompt-library-toggle');
    this.addBtn = document.getElementById('prompt-library-add');
    this.closeBtn = document.getElementById('prompt-library-close');
    this.searchQuery = '';
    this.init();
  }

  init() {
    this.toggleBtn?.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.backdrop?.addEventListener('click', () => this.close());
    this.addBtn?.addEventListener('click', () => this.addPrompt());

    this.searchInput?.addEventListener('input', () => {
      this.searchQuery = this.searchInput.value.toLowerCase().trim();
      this.render();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) this.close();
    });

    state.on('prompt-library-changed', () => this.render());

    document.getElementById('save-prompt-btn')?.addEventListener('click', () => this.saveFromInput());

    this.render();
  }

  isOpen() {
    return this.panel?.classList.contains('open');
  }

  toggle() {
    if (this.isOpen()) this.close();
    else this.open();
  }

  open() {
    this.panel?.classList.add('open');
    this.panel?.setAttribute('aria-hidden', 'false');
    if (this.backdrop) {
      this.backdrop.hidden = false;
      this.backdrop.setAttribute('aria-hidden', 'false');
    }
    this.searchInput?.focus();
  }

  close() {
    this.panel?.classList.remove('open');
    this.panel?.setAttribute('aria-hidden', 'true');
    if (this.backdrop) {
      this.backdrop.hidden = true;
      this.backdrop.setAttribute('aria-hidden', 'true');
    }
    if (this.searchInput) this.searchInput.value = '';
    this.searchQuery = '';
  }

  async addPrompt() {
    const label = await showPrompt({ title: 'Prompt name', placeholder: 'e.g. Code review', confirmText: 'Next' });
    if (!label?.trim()) return;
    const prompt = await showPrompt({
      title: 'Prompt text',
      message: 'Enter the full prompt template',
      multiline: true,
      placeholder: 'Review this code for bugs…',
      confirmText: 'Save',
    });
    if (!prompt?.trim()) return;
    const tagsRaw = await showPrompt({ title: 'Tags (optional)', placeholder: 'coding, review', confirmText: 'Save', cancelText: 'Skip' });
    const tags = tagsRaw?.trim() ? tagsRaw.split(/[,;]/).map(t => t.trim()).filter(Boolean) : [];
    state.addPrompt({ label: label.trim(), prompt: prompt.trim(), tags });
    showToast('Prompt saved');
    this.open();
    this.render();
  }

  async saveFromInput() {
    const input = document.getElementById('message-input');
    const text = input?.value.trim();
    if (!text) {
      showToast('Type a message first', { isError: true });
      return;
    }
    const label = await showPrompt({
      title: 'Save to library',
      defaultValue: text.slice(0, 40),
      placeholder: 'Prompt name',
    });
    if (!label?.trim()) return;
    state.addPrompt({ label: label.trim(), prompt: text });
    showToast('Prompt saved to library');
  }

  getFilteredPrompts() {
    const prompts = state.promptLibrary;
    if (!this.searchQuery) return prompts;
    return prompts.filter(p =>
      p.label.toLowerCase().includes(this.searchQuery) ||
      p.prompt.toLowerCase().includes(this.searchQuery) ||
      (p.tags || []).some(t => t.toLowerCase().includes(this.searchQuery))
    );
  }

  updateCount(total, visible) {
    if (!this.countEl) return;
    if (total === 0) {
      this.countEl.textContent = 'Save and reuse your best prompts';
      return;
    }
    if (this.searchQuery && visible !== total) {
      this.countEl.textContent = `${visible} of ${total} prompt${total !== 1 ? 's' : ''}`;
      return;
    }
    this.countEl.textContent = `${total} saved prompt${total !== 1 ? 's' : ''}`;
  }

  render() {
    if (!this.listEl) return;
    const all = state.promptLibrary;
    const prompts = this.getFilteredPrompts();
    this.updateCount(all.length, prompts.length);

    if (all.length === 0) {
      this.listEl.innerHTML = `
        <div class="prompt-library-empty">
          <div class="prompt-library-empty-icon" aria-hidden="true">${iconHtml('fileText', { size: 32, className: 'icon icon-prompt-empty' })}</div>
          <h3>No prompts yet</h3>
          <p>Save prompts from the input bar or create one to reuse across chats.</p>
          <button type="button" class="btn btn-primary prompt-library-empty-cta" id="prompt-library-empty-add">Create first prompt</button>
        </div>
      `;
      this.listEl.querySelector('#prompt-library-empty-add')?.addEventListener('click', () => this.addPrompt());
      return;
    }

    if (prompts.length === 0) {
      this.listEl.innerHTML = `
        <div class="prompt-library-empty prompt-library-empty--search">
          <p>No prompts match “${this.escape(this.searchQuery)}”</p>
        </div>
      `;
      return;
    }

    this.listEl.innerHTML = prompts.map(p => this.renderCard(p)).join('');
    this.bindCardEvents();
  }

  renderCard(p) {
    const preview = p.prompt.length > PREVIEW_LENGTH
      ? `${p.prompt.slice(0, PREVIEW_LENGTH)}…`
      : p.prompt;
    const charCount = p.prompt.length;
    const tags = (p.tags || []).slice(0, 3).map(t =>
      `<span class="prompt-library-tag">${this.escape(t)}</span>`
    ).join('');

    return `
      <article class="prompt-library-card" data-id="${p.id}">
        <div class="prompt-library-card-top">
          <div class="prompt-library-card-icon" aria-hidden="true">${iconHtml('sparkles', { size: 18, className: 'icon' })}</div>
          <div class="prompt-library-card-meta">
            <h3 class="prompt-library-label">${this.escape(p.label)}</h3>
            ${tags ? `<div class="prompt-library-tags">${tags}</div>` : ''}
          </div>
          <div class="prompt-library-card-menu">
            <button type="button" class="btn-icon btn-sm prompt-edit-btn" data-id="${p.id}" data-tip="Edit this prompt" aria-label="Edit prompt">${iconHtml('pencil', { size: 15, className: 'icon' })}</button>
            <button type="button" class="btn-icon btn-sm prompt-delete-btn" data-id="${p.id}" data-tip="Delete this prompt" aria-label="Delete prompt">${iconHtml('trash', { size: 15, className: 'icon' })}</button>
          </div>
        </div>
        <p class="prompt-library-preview">${this.escape(preview)}</p>
        <div class="prompt-library-card-footer">
          <span class="prompt-library-char-count">${charCount.toLocaleString()} chars</span>
          <button type="button" class="btn btn-primary btn-sm prompt-library-use" data-id="${p.id}">Use prompt</button>
        </div>
      </article>
    `;
  }

  bindCardEvents() {
    this.listEl.querySelectorAll('.prompt-library-use').forEach(btn => {
      btn.addEventListener('click', async () => {
        const entry = state.promptLibrary.find(p => p.id === btn.dataset.id);
        if (!entry || !this.onUsePrompt) return;
        let prompt = entry.prompt;
        const vars = [...prompt.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]);
        const unique = [...new Set(vars)];
        for (const v of unique) {
          const val = await showPrompt({ title: `Value for {{${v}}}`, placeholder: v });
          if (val == null) return;
          prompt = prompt.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), val);
        }
        this.onUsePrompt(prompt);
        this.close();
      });
    });

    this.listEl.querySelectorAll('.prompt-edit-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const entry = state.promptLibrary.find(p => p.id === btn.dataset.id);
        if (!entry) return;
        const label = await showPrompt({ title: 'Edit name', defaultValue: entry.label });
        if (label === null) return;
        const prompt = await showPrompt({ title: 'Edit prompt', defaultValue: entry.prompt, multiline: true });
        if (prompt === null) return;
        state.updatePrompt(entry.id, { label: label.trim() || entry.label, prompt: prompt.trim() || entry.prompt });
        showToast('Prompt updated');
      });
    });

    this.listEl.querySelectorAll('.prompt-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const entry = state.promptLibrary.find(p => p.id === btn.dataset.id);
        if (!entry) return;
        const ok = await showConfirm({
          title: 'Delete prompt',
          message: `Remove “${entry.label}” from your library?`,
          confirmText: 'Delete',
          destructive: true,
        });
        if (ok) {
          state.removePrompt(btn.dataset.id);
          showToast('Prompt deleted');
        }
      });
    });
  }

  escape(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

export function renderWelcomePrompts(container, onUsePrompt) {
  if (!container) return;
  const saved = state.promptLibrary.slice(0, 4);
  const items = saved.map(p => `
    <button type="button" class="quick-action prompt-saved" data-prompt-id="${p.id}">
      <span>${p.label}</span>
    </button>
  `).join('');

  container.querySelectorAll('.prompt-saved').forEach(btn => btn.remove());
  if (items) {
    container.insertAdjacentHTML('beforeend', items);
    container.querySelectorAll('.prompt-saved').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = state.promptLibrary.find(p => p.id === btn.dataset.promptId);
        if (entry && onUsePrompt) onUsePrompt(entry.prompt);
      });
    });
  }
}
