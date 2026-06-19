import { state } from '../state.js';
import { renderMarkdown } from './markdown.js';
import { PROVIDERS } from '../providers/registry.js';
import { QUICK_ACTIONS, PROMPT_TEMPLATES } from '../data/templates.js';
import { showConfirm } from './modal.js';

export class ChatUI {
  constructor(onRegenerate, onRetry, onOpenSettings) {
    this.messagesContainer = document.getElementById('messages');
    this.welcomeContainer = document.getElementById('welcome');
    this.setupCard = document.getElementById('setup-card');
    this.quickActionsEl = document.getElementById('quick-actions');
    this.templateGrid = document.getElementById('template-grid');
    this.headerProviderBadge = document.getElementById('provider-badge');
    this.headerProviderName = document.getElementById('header-provider');
    this.headerModel = document.getElementById('header-model');
    this.sessionCostEl = document.getElementById('session-cost');
    this.chatTitleBtn = document.getElementById('chat-title-btn');
    this.chatTitleEl = document.getElementById('chat-title');
    this.chatMenuBtn = document.getElementById('chat-menu-btn');
    this.chatMenu = document.getElementById('chat-menu');
    this.mobileProvider = document.getElementById('mobile-provider');
    this.mobileModel = document.getElementById('mobile-model');
    this.mobileStatusBar = document.getElementById('mobile-status-bar');
    this.srAnnouncer = document.getElementById('sr-announcer');

    this.onRegenerate = onRegenerate;
    this.onRetry = onRetry;
    this.onOpenSettings = onOpenSettings;
    this.userNearBottom = true;

    this.init();
  }

  init() {
    this.messagesContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
      this.userNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    });

    document.getElementById('export-chat-btn')?.addEventListener('click', () => this.exportChat());
    document.getElementById('duplicate-chat-btn')?.addEventListener('click', () => {
      const chat = state.getActiveChat();
      if (chat) state.duplicateChat(chat.id);
    });
    document.getElementById('clear-chat-btn')?.addEventListener('click', () => this.clearChat());
    document.getElementById('delete-chat-btn')?.addEventListener('click', () => this.deleteChat());

    this.chatMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.chatMenu.hidden = !this.chatMenu.hidden;
    });
    document.addEventListener('click', () => { if (this.chatMenu) this.chatMenu.hidden = true; });

    this.chatTitleBtn?.addEventListener('click', () => this.renameChat());

    document.getElementById('setup-open-settings')?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    this.mobileStatusBar?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

    this.renderQuickActions();
    this.renderTemplates();

    state.on('chat-switched', () => this.render());
    state.on('chat-cleared', () => this.render());
    state.on('chat-renamed', () => this.updateHeader());
    state.on('message-added', () => this.render());
    state.on('message-edited', () => this.render());
    state.on('messages-truncated', () => this.render());
    state.on('settings-changed', () => this.updateHeader());

    this.render();
  }

  renderQuickActions() {
    if (!this.quickActionsEl) return;
    this.quickActionsEl.innerHTML = QUICK_ACTIONS.map(a => `
      <button class="quick-action" data-prompt="${this.escapeAttr(a.prompt)}" type="button">
        <span>${a.label}</span>
      </button>
    `).join('');

    this.quickActionsEl.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!state.isConfigured()) {
          if (this.onOpenSettings) this.onOpenSettings();
          return;
        }
        const prompt = btn.getAttribute('data-prompt');
        const input = document.getElementById('message-input');
        if (input) {
          input.value = prompt;
          input.dispatchEvent(new Event('input'));
          const sendBtn = document.getElementById('send-btn');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
        }
      });
    });
  }

  renderTemplates() {
    if (!this.templateGrid) return;
    this.templateGrid.innerHTML = PROMPT_TEMPLATES.map(t => `
      <button type="button" class="template-card" data-id="${t.id}">
        <span class="template-icon">${t.icon}</span>
        <span class="template-label">${t.label}</span>
        <span class="template-cat">${t.category}</span>
      </button>
    `).join('');

    this.templateGrid.querySelectorAll('.template-card').forEach(btn => {
      btn.addEventListener('click', () => {
        const template = PROMPT_TEMPLATES.find(t => t.id === btn.dataset.id);
        if (!template) return;
        let text = template.prompt;
        for (const v of template.variables) {
          const val = window.prompt(`Enter ${v}:`, v === 'code' ? 'paste code here' : '');
          if (!val) return;
          text = text.replace(`{{${v}}}`, val);
        }
        if (!state.isConfigured()) {
          if (this.onOpenSettings) this.onOpenSettings();
          return;
        }
        const input = document.getElementById('message-input');
        if (input) {
          input.value = text;
          input.dispatchEvent(new Event('input'));
          input.focus();
        }
      });
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
      this.headerProviderBadge.style.display = 'inline-flex';
      this.headerProviderBadge.style.color = providerInfo.color;
      this.headerProviderBadge.style.backgroundColor = `${providerInfo.color}15`;
      const dot = this.headerProviderBadge.querySelector('.provider-dot');
      if (dot) dot.style.backgroundColor = providerInfo.color;
      this.headerModel.textContent = settings.model || 'Select model';

      if (this.mobileProvider) this.mobileProvider.textContent = providerInfo.name;
      if (this.mobileModel) this.mobileModel.textContent = settings.model || 'Select model';
    } else {
      this.headerProviderBadge.style.display = 'none';
      this.headerModel.textContent = 'Select a provider and model';
      if (this.mobileProvider) this.mobileProvider.textContent = 'No provider';
      if (this.mobileModel) this.mobileModel.textContent = 'Select model';
    }

    const cost = chat ? state.getSessionCost(chat.id) : 0;
    if (cost > 0) {
      this.sessionCostEl.textContent = `$${cost.toFixed(4)}`;
      this.sessionCostEl.hidden = false;
    } else {
      this.sessionCostEl.hidden = true;
    }

    const hasMessages = chat && chat.messages.length > 0;
    document.body.classList.toggle('has-messages', hasMessages);
  }

  async clearChat() {
    const chat = state.getActiveChat();
    if (!chat || chat.messages.length === 0) return;
    const ok = await showConfirm({
      title: 'Clear messages',
      message: 'Remove all messages in this conversation?',
      confirmText: 'Clear',
      destructive: true,
    });
    if (ok) state.clearChat(chat.id);
    this.chatMenu.hidden = true;
  }

  async deleteChat() {
    const chat = state.getActiveChat();
    if (!chat) return;
    const ok = await showConfirm({
      title: 'Delete chat',
      message: 'Delete this conversation permanently?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (ok) state.deleteChat(chat.id);
    this.chatMenu.hidden = true;
  }

  exportChat() {
    const chat = state.getActiveChat();
    if (!chat) return;
    const data = state.exportChat(chat.id);
    this.downloadFile(`chat-${chat.title.slice(0, 30)}.json`, data);
    this.chatMenu.hidden = true;
  }

  downloadFile(name, content) {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async renameChat() {
    const chat = state.getActiveChat();
    if (!chat) return;
    const title = prompt('Chat title:', chat.title);
    if (title) state.renameChat(chat.id, title);
  }

  announce(text) {
    if (this.srAnnouncer) {
      this.srAnnouncer.textContent = text;
    }
  }

  render() {
    this.updateHeader();
    const activeChat = state.getActiveChat();
    const configured = state.isConfigured();

    const messageElements = this.messagesContainer.querySelectorAll('.message, .typing-indicator-wrap, .compare-group');
    messageElements.forEach(el => el.remove());

    if (!configured) {
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
        this.messagesContainer.appendChild(this.createCompareGroup(group));
      } else {
        this.messagesContainer.appendChild(this.createMessageElement(msg, i));
        i++;
      }
    }

    this.scrollToBottom();
  }

  createCompareGroup(messages) {
    const wrap = document.createElement('div');
    wrap.className = 'compare-group';
    wrap.innerHTML = `<div class="compare-group-label">Model comparison</div><div class="compare-columns"></div>`;
    const cols = wrap.querySelector('.compare-columns');

    messages.forEach((msg, idx) => {
      const col = document.createElement('div');
      col.className = 'compare-column';
      const modelName = msg.compareModel || msg.model || 'Model';
      col.innerHTML = `
        <div class="compare-column-header">${this.escapeHtml(modelName)}</div>
        <div class="compare-column-body">
          ${msg.isError ? this.renderError(msg.content) : (msg.isStreaming ? this.renderStreaming(msg.content) : renderMarkdown(msg.content))}
        </div>
        <div class="compare-column-meta">
          ${msg.latency ? `<span>${msg.latency}s</span>` : ''}
          ${msg.cost ? `<span>$${msg.cost.toFixed(5)}</span>` : ''}
        </div>
      `;
      cols.appendChild(col);
    });

    return wrap;
  }

  createMessageElement(msg, index) {
    const el = document.createElement('div');
    el.className = `message ${msg.role}${msg.isError ? ' error' : ''}`;
    el.setAttribute('data-index', index);

    const avatar = msg.role === 'user' ? 'U' : 'AI';
    const isAssistant = msg.role === 'assistant';

    let thinkingHtml = '';
    if (isAssistant && msg.thinking) {
      thinkingHtml = `
        <div class="thinking-block">
          <button type="button" class="thinking-header" aria-expanded="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            Reasoning
          </button>
          <div class="thinking-content">${this.escapeHtml(msg.thinking)}</div>
        </div>
      `;
    }

    let metaHtml = '';
    if (isAssistant && (msg.latency || msg.tokens || msg.cost)) {
      const parts = [];
      if (msg.latency) parts.push(`<span class="meta-item">${msg.latency}s</span>`);
      if (msg.tokens) parts.push(`<span class="meta-item">${msg.tokens.total_tokens || msg.tokens} tokens</span>`);
      if (msg.cost != null) parts.push(`<span class="meta-item">$${msg.cost.toFixed(5)}</span>`);
      if (msg.model) parts.push(`<span class="meta-item">${this.escapeHtml(msg.model)}</span>`);
      if (parts.length) metaHtml = `<div class="message-meta">${parts.join('')}</div>`;
    }

    let contentHtml;
    if (msg.isError) {
      contentHtml = this.renderError(msg.content);
    } else if (msg.isStreaming) {
      contentHtml = this.renderStreaming(msg.content);
    } else {
      contentHtml = renderMarkdown(msg.content);
    }

    const actionsHtml = `
      <div class="message-actions">
        <button type="button" class="msg-action-btn copy-msg-btn" title="Copy">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copy
        </button>
        ${msg.role === 'user' ? `
          <button type="button" class="msg-action-btn edit-msg-btn" title="Edit">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Edit
          </button>
        ` : `
          <button type="button" class="msg-action-btn regen-msg-btn" title="Regenerate">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Regenerate
          </button>
        `}
      </div>
    `;

    el.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-content">
          ${thinkingHtml}
          <div class="markdown-body">${contentHtml}</div>
        </div>
        ${metaHtml}
        ${actionsHtml}
      </div>
    `;

    const thinkingBtn = el.querySelector('.thinking-header');
    if (thinkingBtn) {
      thinkingBtn.addEventListener('click', () => {
        const expanded = thinkingBtn.getAttribute('aria-expanded') === 'true';
        thinkingBtn.setAttribute('aria-expanded', String(!expanded));
        thinkingBtn.classList.toggle('collapsed', expanded);
        thinkingBtn.nextElementSibling?.classList.toggle('hidden', expanded);
      });
    }

    el.querySelector('.copy-msg-btn')?.addEventListener('click', () => {
      navigator.clipboard.writeText(msg.content);
    });

    el.querySelector('.edit-msg-btn')?.addEventListener('click', () => {
      const newContent = prompt('Edit message:', msg.content);
      if (newContent && newContent.trim()) {
        const chat = state.getActiveChat();
        state.editUserMessage(chat.id, index, newContent.trim());
        if (this.onRegenerate) this.onRegenerate();
      }
    });

    el.querySelector('.regen-msg-btn')?.addEventListener('click', () => {
      const chat = state.getActiveChat();
      if (!chat) return;
      if (index < chat.messages.length - 1) {
        state.truncateMessagesAfter(chat.id, index - 1);
      } else {
        state.removeLastMessage(chat.id);
      }
      if (this.onRegenerate) this.onRegenerate();
    });

    el.querySelector('.error-retry-btn')?.addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });

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
    this.announce('Assistant is responding…');

    const wrap = document.createElement('div');
    wrap.className = 'typing-indicator-wrap message assistant';
    wrap.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-body">
        <div class="message-content typing-bubble">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
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
    if (force || this.userNearBottom) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
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
