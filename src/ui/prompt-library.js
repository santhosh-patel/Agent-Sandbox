import { state } from '../state.js';
import { showPrompt } from './modal.js';
import { showConfirm } from './modal.js';
import { showToast } from './toast.js';

export class PromptLibraryUI {
  constructor(onUsePrompt) {
    this.onUsePrompt = onUsePrompt;
    this.panel = document.getElementById('prompt-library-panel');
    this.listEl = document.getElementById('prompt-library-list');
    this.toggleBtn = document.getElementById('prompt-library-toggle');
    this.addBtn = document.getElementById('prompt-library-add');
    this.closeBtn = document.getElementById('prompt-library-close');
    this.init();
  }

  init() {
    this.toggleBtn?.addEventListener('click', () => this.toggle());
    this.closeBtn?.addEventListener('click', () => this.close());
    this.addBtn?.addEventListener('click', () => this.addPrompt());

    state.on('prompt-library-changed', () => this.render());

    document.getElementById('save-prompt-btn')?.addEventListener('click', () => this.saveFromInput());

    this.render();
  }

  toggle() {
    this.panel?.classList.toggle('open');
  }

  close() {
    this.panel?.classList.remove('open');
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
    state.addPrompt({ label: label.trim(), prompt: prompt.trim() });
    showToast('Prompt saved');
    this.panel?.classList.add('open');
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

  render() {
    if (!this.listEl) return;
    const prompts = state.promptLibrary;

    if (prompts.length === 0) {
      this.listEl.innerHTML = '<p class="prompt-library-empty">No saved prompts yet. Save one from the input or add new.</p>';
      return;
    }

    this.listEl.innerHTML = prompts.map(p => `
      <div class="prompt-library-item" data-id="${p.id}">
        <button type="button" class="prompt-library-use" data-id="${p.id}">
          <span class="prompt-library-label">${this.escape(p.label)}</span>
          <span class="prompt-library-preview">${this.escape(p.prompt.slice(0, 80))}${p.prompt.length > 80 ? '…' : ''}</span>
        </button>
        <div class="prompt-library-actions">
          <button type="button" class="btn-text btn-sm prompt-edit-btn" data-id="${p.id}">Edit</button>
          <button type="button" class="btn-text btn-sm prompt-delete-btn" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');

    this.listEl.querySelectorAll('.prompt-library-use').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = state.promptLibrary.find(p => p.id === btn.dataset.id);
        if (entry && this.onUsePrompt) {
          this.onUsePrompt(entry.prompt);
          this.close();
        }
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
        const ok = await showConfirm({ title: 'Delete prompt', message: 'Remove this prompt from your library?', confirmText: 'Delete', destructive: true });
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
