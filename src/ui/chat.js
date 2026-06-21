import { state } from '../state.js';
import { renderMarkdown } from './markdown.js';
import { PROVIDERS } from '../providers/registry.js';
import { QUICK_ACTIONS } from '../data/templates.js';
import { RESPONSE_PROFILES } from '../data/presets.js';
import { messageAvatarHtml } from './icons.js';
import { showPrompt } from './modal.js';
import { showToast } from './toast.js';
import { renderWelcomePrompts } from './prompt-library.js';
import { setTip, rollbackTip } from './tooltip.js';
import {
  confirmRegenerate,
  confirmRegenerateAs,
  confirmEditRegenerate,
  confirmPickCompare,
  confirmRetry,
} from './confirm-actions.js';

const QUICK_ACTION_TIPS = {
  compare: 'Enable compare mode — send one prompt to multiple models',
};

export class ChatUI {
  constructor(onRegenerate, onRetry, onOpenSettings, onFollowUp, onPickCompare, getModelOptions) {
    this.messagesContainer = document.getElementById('messages');
    this.welcomeContainer = document.getElementById('welcome');
    this.setupCard = document.getElementById('setup-card');
    this.quickActionsEl = document.getElementById('quick-actions');
    this.headerProviderBadge = null;
    this.headerProviderName = document.getElementById('header-provider');
    this.headerModel = document.getElementById('header-model');
    this.sessionCostEl = document.getElementById('session-cost');
    this.chatTitleBtn = document.getElementById('chat-title-btn');
    this.chatTitleEl = document.getElementById('chat-title');
    this.mobileProvider = document.getElementById('mobile-provider');
    this.mobileModel = document.getElementById('mobile-model');
    this.mobileStatusBar = document.getElementById('mobile-status-bar');
    this.srAnnouncer = document.getElementById('sr-announcer');
    this.welcomeAssistantName = document.getElementById('welcome-assistant-name');

    this.onRegenerate = onRegenerate;
    this.onRetry = onRetry;
    this.onOpenSettings = onOpenSettings;
    this.onFollowUp = onFollowUp;
    this.onPickCompare = onPickCompare;
    this.getModelOptions = getModelOptions;
    this.regenMenuEl = null;
    this.rollbackBtn = document.getElementById('chat-rollback-btn');
    this.userNearBottom = true;
    this.stickToBottom = true;
    this.scrollBtn = null;

    this.init();
  }

  init() {
    this.scrollBtn = document.getElementById('scroll-bottom-btn');
    this.scrollBtn?.addEventListener('click', () => {
      this.stickToBottom = true;
      this.scrollToBottom(true);
    });

    this.messagesContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
      this.userNearBottom = nearBottom;
      if (!nearBottom) this.stickToBottom = false;
      if (this.scrollBtn) {
        this.scrollBtn.classList.toggle('visible', !nearBottom && scrollHeight > clientHeight + 200);
      }
    });

    this.chatTitleBtn?.addEventListener('click', () => this.renameChat());

    this.rollbackBtn?.addEventListener('click', () => this.handleRollback());

    this.mobileStatusBar?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    this.renderQuickActions();

    state.on('chat-switched', () => this.render());
    state.on('chat-cleared', () => this.render());
    state.on('chat-renamed', () => this.updateHeader());
    state.on('message-added', ({ chatId }) => this.handleMessageAdded(chatId));
    state.on('message-edited', () => this.render({ animate: false }));
    state.on('messages-truncated', () => this.render({ animate: false }));
    state.on('settings-changed', () => {
      this.updateHeader();
      this.updateAssistantBranding();
      if (!state.isConfigured()) this.updateSetupCard();
    });
    state.on('follow-ups-updated', () => this.handleFollowUpsUpdated());
    state.on('compare-picked', () => this.render({ animate: false }));
    state.on('undo-changed', () => this.updateRollbackButton());
    state.on('chat-undo', ({ label }) => {
      showToast(`Rolled back${label ? `: ${label}` : ''}`);
      this.render({ animate: false });
    });
    state.on('prompt-library-changed', () => this.renderQuickActions());

    this.render();
    this.updateAssistantBranding();
    this.bindSetupCard();
  }

  bindSetupCard() {
    if (!this.setupCard) return;
    const dismissed = localStorage.getItem('onboarding-dismissed') === '1';
    this.setupCard.hidden = dismissed && state.isConfigured();

    document.getElementById('setup-open-settings-btn')?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });
    document.getElementById('setup-openrouter-btn')?.addEventListener('click', () => {
      state.updateSettings({ provider: 'openrouter' });
      const select = document.getElementById('provider-select');
      if (select) {
        select.value = 'openrouter';
        select.dispatchEvent(new Event('change'));
      }
      if (this.onOpenSettings) this.onOpenSettings();
    });
    document.getElementById('setup-dismiss-btn')?.addEventListener('click', () => {
      localStorage.setItem('onboarding-dismissed', '1');
      this.setupCard.hidden = true;
    });
  }

  updateAssistantBranding() {
    const name = state.getAssistantName();
    if (this.welcomeAssistantName) this.welcomeAssistantName.textContent = name;
  }

  handleMessageAdded(chatId) {
    const chat = state.getActiveChat();
    if (!chat || chat.id !== chatId) return;

    this.stickToBottom = true;
    const domMessages = this.messagesContainer.querySelectorAll('.message:not(.typing-indicator-wrap)');
    const index = chat.messages.length - 1;
    const msg = chat.messages[index];

    if (domMessages.length === index && msg && !msg.compareId) {
      this.setupCard.hidden = true;
      if (chat.messages.length === 0) {
        this.welcomeContainer.style.display = 'flex';
      } else {
        this.welcomeContainer.style.display = 'none';
        this.messagesContainer.appendChild(this.createMessageElement(msg, index, true));
      }
      this.updateHeader();
      this.scrollToBottom(true);
      return;
    }

    this.render({ animate: false });
    this.scrollToBottom(true);
  }

  handleFollowUpsUpdated() {
    const chat = state.getActiveChat();
    if (!chat) return;
    this.renderFollowUps(chat);
    this.scrollToBottom(true);
  }

  renderQuickActions() {
    if (!this.quickActionsEl) return;
    const compareAction = { prompt: '', label: 'Compare models', action: 'compare' };
    const actions = [...QUICK_ACTIONS, compareAction];
    this.quickActionsEl.innerHTML = actions.map(a => `
      <button class="quick-action" data-prompt="${this.escapeAttr(a.prompt)}" data-action="${a.action || ''}" type="button"
        data-tip="${this.escapeAttr(a.action === 'compare' ? QUICK_ACTION_TIPS.compare : `Try: ${a.label}`)}">
        <span>${a.label}</span>
      </button>
    `).join('');

    this.quickActionsEl.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'compare') {
          state.updateSettings({ compareMode: true });
          if (this.onOpenSettings) this.onOpenSettings();
          showToast('Compare mode enabled — pick models in settings');
          return;
        }
        if (!state.isConfigured()) {
          if (this.onOpenSettings) this.onOpenSettings();
          return;
        }
        const prompt = btn.getAttribute('data-prompt');
        if (this.onFollowUp) this.onFollowUp(prompt);
      });
    });

    renderWelcomePrompts(this.quickActionsEl, (prompt) => {
      if (!state.isConfigured()) {
        if (this.onOpenSettings) this.onOpenSettings();
        return;
      }
      if (this.onFollowUp) this.onFollowUp(prompt);
    });
  }

  updateHeader() {
    const settings = state.settings;
    const chat = state.getActiveChat();
    const providerInfo = PROVIDERS[settings.provider];

    if (chat) {
      this.chatTitleEl.textContent = chat.title;
    }

    if (providerInfo) {
      this.headerProviderName.textContent = providerInfo.name;
      this.headerModel.textContent = settings.model || 'Select model';
      setTip(this.headerProviderName, 'Active API provider for this chat');
      setTip(this.headerModel, settings.model || 'No model selected — open settings');

      if (this.mobileProvider) this.mobileProvider.textContent = providerInfo.name;
      if (this.mobileModel) this.mobileModel.textContent = settings.model || 'Select model';
    } else {
      this.headerProviderName.textContent = 'No provider';
      this.headerModel.textContent = 'Select model';
      if (this.mobileProvider) this.mobileProvider.textContent = 'No provider';
      if (this.mobileModel) this.mobileModel.textContent = 'Select model';
    }

    const cost = chat ? state.getSessionCost(chat.id) : 0;
    if (cost > 0) {
      this.sessionCostEl.textContent = `$${cost.toFixed(4)}`;
      this.sessionCostEl.hidden = false;
      setTip(this.sessionCostEl, 'Estimated total cost for this chat session');
    } else {
      this.sessionCostEl.hidden = true;
      setTip(this.sessionCostEl, '');
    }

    const hasMessages = chat && chat.messages.length > 0;
    document.body.classList.toggle('has-messages', hasMessages);
    this.updateRollbackButton();
  }

  updateRollbackButton() {
    const chat = state.getActiveChat();
    const btn = this.rollbackBtn || document.getElementById('chat-rollback-btn');
    if (!btn) return;
    const can = chat && state.canUndo(chat.id);
    btn.hidden = !can;
    if (can) {
      setTip(btn, rollbackTip(state.getUndoLabel(chat.id)), 'bottom');
    } else {
      setTip(btn, 'Restore the chat to before your last destructive action', 'bottom');
    }
  }

  handleRollback() {
    const chat = state.getActiveChat();
    if (!chat || !state.canUndo(chat.id)) return;
    state.undoLastChange(chat.id);
  }

  async renameChat() {
    const chat = state.getActiveChat();
    if (!chat) return;
    const title = await showPrompt({ title: 'Rename chat', defaultValue: chat.title });
    if (title?.trim()) state.renameChat(chat.id, title.trim());
  }

  announce(text) {
    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = text;
    }
  }

  beginAssistantResponse() {
    this.stickToBottom = true;
    this.removeTypingIndicator();
  }

  render({ animate = false } = {}) {
    this.updateHeader();
    const activeChat = state.getActiveChat();
    const configured = state.isConfigured();

    const messageElements = this.messagesContainer.querySelectorAll('.message, .typing-indicator-wrap, .compare-group');
    messageElements.forEach(el => el.remove());

    if (!configured) {
      this.updateSetupCard();
      this.setupCard.hidden = false;
      this.welcomeContainer.style.display = 'flex';
      return;
    }

    this.setupCard.hidden = true;

    if (!activeChat || activeChat.messages.length === 0) {
      this.welcomeContainer.style.display = 'flex';
      return;
    }

    this.welcomeContainer.style.display = 'none';

    let i = 0;
    while (i < activeChat.messages.length) {
      const msg = activeChat.messages[i];
      if (msg.compareId) {
        const group = [msg];
        const compareId = msg.compareId;
        i++;
        while (i < activeChat.messages.length && activeChat.messages[i].compareId === compareId) {
          group.push(activeChat.messages[i]);
          i++;
        }
        const groupEl = this.createCompareGroup(group);
        if (animate) groupEl.classList.add('message-enter');
        this.messagesContainer.appendChild(groupEl);
      } else {
        this.messagesContainer.appendChild(this.createMessageElement(msg, i, animate));
        i++;
      }
    }

    this.renderFollowUps(activeChat);
    this.scrollToBottom();
  }

  updateMessageAt(index, msg) {
    const el = this.messagesContainer.querySelector(`.message[data-index="${index}"]`);
    if (!el) {
      this.render({ animate: false });
      this.scrollToBottom(true);
      return;
    }
    this.patchMessageElement(el, msg, index);
    this.scrollToBottom(true);
  }

  updateCompareMessage(compareId, model, msg) {
    const group = this.messagesContainer.querySelector(`.compare-group[data-compare-id="${compareId}"]`);
    if (!group) {
      this.render({ animate: false });
      this.scrollToBottom(true);
      return;
    }

    const columns = group.querySelectorAll('.compare-column');
    for (const col of columns) {
      if (col.dataset.model !== model && col.dataset.model !== msg.compareModel) continue;
      const body = col.querySelector('.compare-column-body');
      if (body) {
        body.innerHTML = msg.isError
          ? this.renderError(msg.content)
          : (msg.isStreaming ? this.renderStreaming(msg.content) : renderMarkdown(msg.content));
      }
      const meta = col.querySelector('.compare-column-meta');
      if (meta) {
        meta.innerHTML = `
          ${msg.latency ? `<span>${msg.latency}s</span>` : ''}
          ${msg.cost != null ? `<span>$${msg.cost.toFixed(5)}</span>` : ''}
        `;
      }
      const useBtn = col.querySelector('.compare-use-btn');
      if (useBtn && !msg.isStreaming && !msg.isError) {
        useBtn.style.display = '';
      } else if (useBtn) {
        useBtn.style.display = 'none';
      }
      break;
    }
    this.scrollToBottom(true);
  }

  patchMessageElement(el, msg, index) {
    const isAssistant = msg.role === 'assistant';
    const contentEl = el.querySelector('.message-content');
    if (!contentEl) return;

    let thinkingBlock = contentEl.querySelector('.thinking-block');
    if (isAssistant && msg.thinking) {
      if (!thinkingBlock) {
        contentEl.insertAdjacentHTML('afterbegin', `
          <div class="thinking-block">
            <button type="button" class="thinking-header" aria-expanded="true">Reasoning</button>
            <div class="thinking-content">${this.escapeHtml(msg.thinking)}</div>
          </div>
        `);
        this.bindThinkingToggle(contentEl.querySelector('.thinking-header'));
      } else {
        const thinkingContent = thinkingBlock.querySelector('.thinking-content');
        if (thinkingContent) thinkingContent.textContent = msg.thinking;
      }
    } else if (thinkingBlock) {
      thinkingBlock.remove();
    }

    const markdownBody = contentEl.querySelector('.markdown-body');
    if (markdownBody) {
      if (msg.isError) {
        markdownBody.innerHTML = this.renderError(msg.content);
        this.bindErrorActions(el, index);
      } else if (msg.isStreaming) {
        markdownBody.innerHTML = this.renderStreaming(msg.content);
      } else {
        markdownBody.innerHTML = renderMarkdown(msg.content);
      }
    }

    const body = el.querySelector('.message-body');
    if (!body) return;

    const metaHtml = this.buildMetaHtml(msg);
    const existingMeta = body.querySelector('.message-meta');
    if (metaHtml) {
      if (existingMeta) existingMeta.outerHTML = metaHtml;
      else body.insertAdjacentHTML('beforeend', metaHtml);
    } else if (existingMeta) {
      existingMeta.remove();
    }
  }

  buildMetaHtml(msg) {
    if (msg.role !== 'assistant' || !(msg.latency || msg.tokens || msg.cost)) return '';
    const parts = [];
    if (msg.latency) parts.push(`<span class="meta-item">${msg.latency}s</span>`);
    if (msg.tokens) parts.push(`<span class="meta-item">${msg.tokens.total_tokens || msg.tokens} tokens</span>`);
    if (msg.cost != null) parts.push(`<span class="meta-item">$${msg.cost.toFixed(5)}</span>`);
    if (msg.model) parts.push(`<span class="meta-item">${this.escapeHtml(msg.model)}</span>`);
    if (!parts.length) return '';
    return `<div class="message-meta">${parts.join('')}</div>`;
  }

  bindThinkingToggle(thinkingBtn) {
    if (!thinkingBtn) return;
    thinkingBtn.addEventListener('click', () => {
      const expanded = thinkingBtn.getAttribute('aria-expanded') === 'true';
      thinkingBtn.setAttribute('aria-expanded', String(!expanded));
      thinkingBtn.classList.toggle('collapsed', expanded);
      thinkingBtn.nextElementSibling?.classList.toggle('hidden', expanded);
    });
  }

  bindErrorActions(el, index) {
    el.querySelector('.error-retry-btn')?.addEventListener('click', async () => {
      const ok = await confirmRetry();
      if (!ok) return;
      if (this.onRetry) this.onRetry();
    });
  }

  updateSetupCard() {
    if (!this.setupCard) return;
    const dismissed = localStorage.getItem('onboarding-dismissed') === '1';
    const configured = state.isConfigured();
    this.setupCard.hidden = dismissed && configured;

    const stepsEl = this.setupCard.querySelector('#setup-steps') || this.setupCard.querySelector('.setup-steps');
    if (!stepsEl) return;
    const steps = [
      { id: 'provider', label: 'Choose a provider', done: !!state.settings.provider },
      { id: 'key', label: 'Add your API key', done: state.settings.provider === 'openrouter' || !!state.getApiKey(state.settings.provider) },
      { id: 'model', label: 'Pick a model and send a message', done: !!state.settings.model },
    ];
    stepsEl.innerHTML = steps.map(s =>
      `<li data-step="${s.id}" class="${s.done ? 'setup-step--done' : 'setup-step--pending'}">${s.label}${s.done ? ' ✓' : ''}</li>`,
    ).join('');
    const hint = this.setupCard.querySelector('.setup-hint');
    const issues = state.getSetupIssues();
    if (hint) {
      if (issues.length) {
        hint.textContent = `Next: ${issues[0]}`;
        hint.hidden = false;
      } else {
        hint.textContent = '';
        hint.hidden = true;
      }
    }
  }

  bindMessageActions(el, msg, index) {
    el.querySelector('.copy-msg-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content).then(() => showToast('Copied to clipboard'));
    });

    el.querySelector('.edit-msg-btn')?.addEventListener('click', async () => {
      const newContent = await showPrompt({ title: 'Edit message', defaultValue: msg.content, multiline: true, confirmText: 'Continue' });
      if (!newContent?.trim()) return;
      const ok = await confirmEditRegenerate();
      if (!ok) return;
      const chat = state.getActiveChat();
      state.editUserMessage(chat.id, index, newContent.trim());
      if (this.onRegenerate) this.onRegenerate({});
    });

    el.querySelector('.regen-msg-btn')?.addEventListener('click', async () => {
      const chat = state.getActiveChat();
      const removesFollowing = chat && index < chat.messages.length - 1;
      const ok = await confirmRegenerate({ removesFollowing });
      if (!ok) return;
      this.prepareRegenerate(index);
      if (this.onRegenerate) this.onRegenerate({});
    });

    el.querySelector('.regen-as-msg-btn')?.addEventListener('click', (e) => {
      this.showRegenerateMenu(e.currentTarget, index);
    });

    el.querySelector('.inspect-msg-btn')?.addEventListener('click', () => {
      this.showMessageInspector(msg, index);
    });

    this.bindErrorActions(el, index);
  }

  showMessageInspector(msg, index) {
    const chat = state.getActiveChat();
    const effective = chat?.settings ? { ...state.settings, ...chat.settings } : state.settings;
    const drawer = document.getElementById('inspector-drawer');
    const backdrop = document.getElementById('inspector-backdrop');
    const body = document.getElementById('inspector-drawer-body');
    if (!drawer || !body) return;

    const rows = [
      ['Model', msg.model || effective.model || '—'],
      ['Provider', effective.provider || '—'],
      ['Profile', effective.responseProfile || 'balanced'],
      ['Temperature', effective.temperature ?? '—'],
      ['Latency', msg.latency != null ? `${msg.latency}s` : '—'],
      ['Cost (est.)', msg.cost != null ? `$${msg.cost.toFixed(5)}` : '—'],
      ['Tokens', msg.tokens ? `${msg.tokens.prompt_tokens || 0} prompt / ${msg.tokens.completion_tokens || 0} completion` : '—'],
      ['History index', String(index)],
      ['Message ID', msg.id || '—'],
    ];

    body.innerHTML = rows.map(([k, v]) => `
      <div class="inspector-row"><span class="inspector-key">${k}</span><span class="inspector-val">${this.escapeHtml(String(v))}</span></div>
    `).join('') + (msg.content ? `<div class="inspector-section"><div class="inspector-key">Content preview</div><pre class="inspector-pre">${this.escapeHtml(msg.content.slice(0, 1200))}${msg.content.length > 1200 ? '…' : ''}</pre></div>` : '');

    drawer.classList.remove('collapsed');
    if (backdrop) backdrop.hidden = false;

    const close = () => {
      drawer.classList.add('collapsed');
      if (backdrop) backdrop.hidden = true;
    };
    document.getElementById('inspector-close-btn')?.addEventListener('click', close, { once: true });
    backdrop?.addEventListener('click', close, { once: true });
  }

  prepareRegenerate(index) {
    const chat = state.getActiveChat();
    if (!chat) return;
    state.pushUndoSnapshot(chat.id, 'Before regenerate');
    if (index < chat.messages.length - 1) {
      state.truncateMessagesAfter(chat.id, index - 1, { skipUndo: true });
    } else {
      state.removeLastMessage(chat.id);
    }
  }

  closeRegenerateMenu() {
    this.regenMenuEl?.remove();
    this.regenMenuEl = null;
    if (this._regenMenuOutside) {
      document.removeEventListener('click', this._regenMenuOutside);
      this._regenMenuOutside = null;
    }
  }

  showRegenerateMenu(anchor, index) {
    this.closeRegenerateMenu();

    const models = this.getModelOptions?.() || [];
    const favorites = new Set(state.settings.favoriteModels || []);
    const recent = state.settings.recentModels || [];
    const prioritized = [
      ...recent.map(id => models.find(m => m.id === id)).filter(Boolean),
      ...models.filter(m => favorites.has(m.id)),
    ];
    const seen = new Set();
    const modelChoices = [];
    prioritized.forEach(m => {
      if (!seen.has(m.id)) { seen.add(m.id); modelChoices.push(m); }
    });
    models.slice(0, 8).forEach(m => {
      if (!seen.has(m.id)) { seen.add(m.id); modelChoices.push(m); }
    });
    if (state.settings.model && !seen.has(state.settings.model)) {
      modelChoices.unshift({ id: state.settings.model, name: state.settings.model.split('/').pop() });
    }

    const menu = document.createElement('div');
    menu.className = 'regen-menu';
    menu.innerHTML = `
      <div class="regen-menu-section">
        <div class="regen-menu-label">Model</div>
        ${modelChoices.length
          ? modelChoices.map(m => `<button type="button" class="regen-menu-item" data-model="${this.escapeAttr(m.id)}">${this.escapeHtml(m.name)}</button>`).join('')
          : `<button type="button" class="regen-menu-item" data-model="${this.escapeAttr(state.settings.model)}">Current model</button>`}
      </div>
      <div class="regen-menu-section">
        <div class="regen-menu-label">Style</div>
        ${Object.entries(RESPONSE_PROFILES).map(([key, p]) =>
          `<button type="button" class="regen-menu-item" data-profile="${key}">${p.label}</button>`,
        ).join('')}
      </div>
    `;

    document.body.appendChild(menu);
    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.left = `${Math.min(rect.left, window.innerWidth - menu.offsetWidth - 12)}px`;

    this.regenMenuEl = menu;

    menu.querySelectorAll('.regen-menu-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const options = {};
        if (btn.dataset.model) options.model = btn.dataset.model;
        if (btn.dataset.profile) options.responseProfile = btn.dataset.profile;
        const profileLabel = options.responseProfile
          ? RESPONSE_PROFILES[options.responseProfile]?.label || options.responseProfile
          : '';
        const ok = await confirmRegenerateAs({ model: options.model, profile: profileLabel });
        if (!ok) return;
        this.prepareRegenerate(index);
        if (this.onRegenerate) this.onRegenerate(options);
        this.closeRegenerateMenu();
      });
    });

    this._regenMenuOutside = (e) => {
      if (!menu.contains(e.target) && e.target !== anchor) this.closeRegenerateMenu();
    };
    setTimeout(() => document.addEventListener('click', this._regenMenuOutside), 0);
  }

  renderFollowUps(chat) {
    this.messagesContainer.querySelectorAll('.follow-up-wrap').forEach(el => el.remove());

    if (!chat || chat.messages.length === 0) return;

    const wrap = document.createElement('div');
    wrap.className = 'follow-up-wrap';

    if (chat.followUpsLoading) {
      wrap.innerHTML = `
        <div class="follow-up-label">Suggested follow-ups</div>
        <div class="follow-up-loading">Generating suggestions…</div>
      `;
      this.messagesContainer.appendChild(wrap);
      return;
    }

    const suggestions = chat.followUpSuggestions || [];
    if (suggestions.length === 0) return;

    wrap.innerHTML = `
      <div class="follow-up-label">Suggested follow-ups</div>
      <div class="follow-up-list"></div>
    `;

    const list = wrap.querySelector('.follow-up-list');
    suggestions.forEach(text => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'follow-up-chip';
      btn.textContent = text;
      btn.addEventListener('click', () => {
        if (this.onFollowUp) this.onFollowUp(text);
      });
      list.appendChild(btn);
    });

    this.messagesContainer.appendChild(wrap);
  }

  createCompareGroup(messages) {
    const wrap = document.createElement('div');
    wrap.className = 'compare-group';
    const compareId = messages[0]?.compareId || '';
    wrap.setAttribute('data-compare-id', compareId);

    const summaryParts = messages.map(m => {
      const parts = [];
      if (m.latency) parts.push(`${m.latency}s`);
      if (m.cost != null) parts.push(`$${m.cost.toFixed(5)}`);
      if (m.tokens?.total_tokens) parts.push(`${m.tokens.total_tokens} tok`);
      return `<span class="compare-summary-item"><strong>${this.escapeHtml(m.compareModel || m.model || 'Model')}</strong>: ${parts.join(' · ') || '—'}</span>`;
    });

    wrap.innerHTML = `
      <div class="compare-group-header">
        <div class="compare-group-label">Model comparison</div>
        <div class="compare-summary">${summaryParts.join('')}</div>
      </div>
      <div class="compare-columns"></div>
    `;
    const cols = wrap.querySelector('.compare-columns');

    messages.forEach((msg) => {
      const col = document.createElement('div');
      col.className = 'compare-column';
      const modelName = msg.compareModel || msg.model || 'Model';
      col.dataset.model = modelName;
      col.innerHTML = `
        <div class="compare-column-header">
          <div class="compare-column-title">
            <span class="compare-column-model">${this.escapeHtml(modelName)}</span>
            <div class="compare-column-meta">
              ${msg.latency ? `<span>${msg.latency}s</span>` : ''}
              ${msg.cost != null ? `<span>$${msg.cost.toFixed(5)}</span>` : ''}
              ${msg.tokens?.total_tokens ? `<span>${msg.tokens.total_tokens} tok</span>` : ''}
            </div>
          </div>
          <button type="button" class="compare-collapse-btn" aria-expanded="true" aria-label="Toggle response">▼</button>
        </div>
        <div class="compare-column-body">
          ${msg.isError ? this.renderError(msg.content) : (msg.isStreaming ? this.renderStreaming(msg.content) : renderMarkdown(msg.content))}
        </div>
        <div class="compare-column-footer">
          ${!msg.isStreaming && !msg.isError ? `<button type="button" class="btn btn-ghost btn-sm compare-use-btn" data-model="${this.escapeAttr(modelName)}" data-tip="Continue the chat using this model's response">Use this response</button>` : ''}
        </div>
      `;

      col.querySelector('.compare-collapse-btn')?.addEventListener('click', (e) => {
        const btn = e.currentTarget;
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!expanded));
        btn.textContent = expanded ? '▶' : '▼';
        col.querySelector('.compare-column-body')?.classList.toggle('collapsed', expanded);
        col.querySelector('.compare-column-footer')?.classList.toggle('collapsed', expanded);
      });

      col.querySelector('.compare-use-btn')?.addEventListener('click', async () => {
        const ok = await confirmPickCompare(modelName);
        if (!ok) return;
        if (this.onPickCompare) this.onPickCompare(compareId, modelName);
      });

      cols.appendChild(col);
    });

    return wrap;
  }

  createMessageElement(msg, index, animate = false) {
    const el = document.createElement('div');
    el.className = `message ${msg.role}${msg.isError ? ' error' : ''}${animate ? ' message-enter' : ''}`;
    el.setAttribute('data-index', index);

    const isAssistant = msg.role === 'assistant';

    let thinkingHtml = '';
    if (isAssistant && msg.thinking) {
      thinkingHtml = `
        <div class="thinking-block">
          <button type="button" class="thinking-header" aria-expanded="true">Reasoning</button>
          <div class="thinking-content">${this.escapeHtml(msg.thinking)}</div>
        </div>
      `;
    }

    const metaHtml = this.buildMetaHtml(msg);

    let contentHtml;
    if (msg.isError) {
      contentHtml = this.renderError(msg.content);
    } else if (msg.isStreaming) {
      contentHtml = this.renderStreaming(msg.content);
    } else {
      contentHtml = renderMarkdown(msg.content);
    }

    const imagesHtml = msg.images?.length
      ? `<div class="message-images">${msg.images.map(img => `<img src="${img.dataUrl}" alt="Attached image" class="message-image" loading="lazy" />`).join('')}</div>`
      : '';

    const actionsHtml = `
      <div class="message-actions">
        <button type="button" class="msg-action-btn copy-msg-btn" data-tip="Copy message to clipboard">Copy</button>
        ${msg.role === 'user'
          ? '<button type="button" class="msg-action-btn edit-msg-btn" data-tip="Edit and resend this message">Edit</button>'
          : `<span class="regen-actions">
              <button type="button" class="msg-action-btn regen-msg-btn" data-tip="Regenerate this response">Regenerate</button>
              <button type="button" class="msg-action-btn regen-as-msg-btn" aria-label="Regenerate as" data-tip="Regenerate with a different model or style">▾</button>
              <button type="button" class="msg-action-btn inspect-msg-btn" data-tip="View tokens, latency, cost, and model details">Inspect</button>
            </span>`}
      </div>
    `;

    el.innerHTML = `
      ${messageAvatarHtml(msg.role)}
      <div class="message-body">
        <div class="message-content">
          ${thinkingHtml}
          ${imagesHtml}
          <div class="markdown-body">${contentHtml}</div>
        </div>
        ${metaHtml}
        ${actionsHtml}
      </div>
    `;

    this.bindThinkingToggle(el.querySelector('.thinking-header'));
    this.bindMessageActions(el, msg, index);

    return el;
  }

  renderError(message) {
    const text = this.escapeHtml(message.replace(/<[^>]*>/g, ''));
    return `
      <div class="error-bubble">
        <p>${text}</p>
        <div class="error-actions">
          <button type="button" class="btn btn-ghost btn-sm error-retry-btn">Retry</button>
          <button type="button" class="btn btn-ghost btn-sm error-settings-btn" onclick="document.getElementById('settings-edge-toggle')?.click()">Check settings</button>
        </div>
      </div>
    `;
  }

  renderStreaming(content) {
    if (!content) return '<span class="streaming-cursor"></span>';
    return renderMarkdown(content) + '<span class="streaming-cursor"></span>';
  }

  showTypingIndicator() {
    this.removeTypingIndicator();
    this.welcomeContainer.style.display = 'none';
    this.announce(`${state.getAssistantName()} is responding…`);

    const wrap = document.createElement('div');
    wrap.className = 'typing-indicator-wrap message assistant message-enter';
    wrap.innerHTML = `
      ${messageAvatarHtml('assistant')}
      <div class="message-body">
        <div class="message-content typing-bubble">
          <span class="typing-text">${this.escapeHtml(state.getAssistantName())} is thinking…</span>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(wrap);
    this.scrollToBottom(true);
  }

  removeTypingIndicator() {
    this.messagesContainer.querySelector('.typing-indicator-wrap')?.remove();
  }

  scrollToBottom(force = false) {
    if (force || this.stickToBottom || this.userNearBottom) {
      requestAnimationFrame(() => {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        requestAnimationFrame(() => {
          this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        });
      });
    }
  }

  escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  escapeAttr(text) {
    return this.escapeHtml(text).replace(/'/g, '&#39;');
  }
}
