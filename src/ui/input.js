import { state } from '../state.js';
import { estimateCost } from '../providers/registry.js';
import { PROVIDERS } from '../providers/registry.js';

export class InputUI {
  constructor(onSend, onStop) {
    this.textarea = document.getElementById('message-input');
    this.sendBtn = document.getElementById('send-btn');
    this.stopBtn = document.getElementById('stop-btn');
    this.charCount = document.getElementById('char-count');
    this.costEstimate = document.getElementById('cost-estimate');
    this.modelPill = document.getElementById('input-model-pill');

    this.onSend = onSend;
    this.onStop = onStop;
    this.getAttachments = null;

    this.init();
  }

  setAttachmentGetter(fn) {
    this.getAttachments = fn;
  }

  init() {
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('keydown', (e) => this.handleKeyDown(e));

    this.sendBtn.addEventListener('click', () => this.triggerSend());
    this.stopBtn.addEventListener('click', () => {
      if (this.onStop) this.onStop();
    });

    state.on('settings-changed', () => {
      this.updatePlaceholder();
      this.updateModelPill();
    });
    this.updatePlaceholder();
    this.updateModelPill();
    this.handleInput();
  }

  updateModelPill() {
    if (!this.modelPill) return;
    const s = state.settings;
    const provider = PROVIDERS[s.provider];
    if (provider && s.model) {
      const short = s.model.split('/').pop().split('-').slice(0, 2).join('-');
      this.modelPill.textContent = short.length > 18 ? short.slice(0, 16) + '…' : short;
      this.modelPill.title = `${provider.name} · ${s.model}`;
    } else {
      this.modelPill.textContent = 'No model';
      this.modelPill.title = 'Open settings to choose a model';
    }
  }

  updatePlaceholder() {
    if (!state.isConfigured()) {
      this.textarea.placeholder = 'Configure API key in settings to start…';
      this.textarea.disabled = false;
    } else {
      this.textarea.placeholder = 'Ask anything, paste images, test models…';
    }
  }

  handleInput() {
    this.textarea.style.height = 'auto';
    this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 200)}px`;

    const val = this.textarea.value.trim();
    const hasAttachments = this.getAttachments?.()?.length > 0;
    const configured = state.isConfigured();
    this.sendBtn.disabled = (!val && !hasAttachments) || !configured;

    if (this.textarea.value.length > 500) {
      this.charCount.textContent = `${this.textarea.value.length} chars`;
    } else {
      this.charCount.textContent = '';
    }

    this.updateCostEstimate();
  }

  refreshSendState() {
    this.handleInput();
  }

  updateCostEstimate() {
    const text = this.textarea.value.trim();
    if (text.length < 100) {
      this.costEstimate.hidden = true;
      return;
    }
    const settings = state.settings;
    if (!settings.model) {
      this.costEstimate.hidden = true;
      return;
    }
    const tokens = Math.ceil(text.split(/\s+/).length * 1.3);
    const cost = estimateCost(settings.model, tokens, settings.maxTokens / 2);
    if (cost) {
      this.costEstimate.textContent = `Est. ~$${cost.toFixed(4)} for this prompt`;
      this.costEstimate.hidden = false;
    } else {
      this.costEstimate.hidden = true;
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.triggerSend();
    }
  }

  triggerSend() {
    const val = this.textarea.value.trim();
    const images = this.getAttachments?.() || [];
    if ((!val && !images.length) || this.sendBtn.disabled) return;
    if (this.onSend) this.onSend(val, images);
    this.textarea.value = '';
    this.handleInput();
  }

  setPrompt(prompt) {
    this.textarea.value = prompt;
    this.handleInput();
    this.textarea.focus();
  }

  setLoading(isLoading) {
    if (isLoading) {
      this.sendBtn.style.display = 'none';
      this.stopBtn.style.display = 'flex';
      this.textarea.disabled = true;
    } else {
      this.sendBtn.style.display = 'flex';
      this.stopBtn.style.display = 'none';
      this.textarea.disabled = false;
      this.textarea.focus();
      this.handleInput();
    }
  }

  focus() {
    this.textarea.focus();
  }
}
