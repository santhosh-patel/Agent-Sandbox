import { state } from '../state.js';
import { renderMarkdown } from './markdown.js';
import { PROVIDERS } from '../providers/registry.js';
import { QUICK_ACTIONS } from '../data/templates.js';
import { messageAvatarHtml } from './icons.js';

export class ChatUI {
  constructor(onRegenerate, onRetry, onOpenSettings, onFollowUp) {
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
    this.topnavStatusText = document.getElementById('topnav-status-text');
    this.srAnnouncer = document.getElementById('sr-announcer');

    this.onRegenerate = onRegenerate;
    this.onRetry = onRetry;
    this.onOpenSettings = onOpenSettings;
    this.onFollowUp = onFollowUp;
    this.userNearBottom = true;
    this.stickToBottom = true;

    this.init();
  }

  init() {
    this.messagesContainer.addEventListener('scroll', () => {
      const { scrollTop, scrollHeight, clientHeight } = this.messagesContainer;
      const nearBottom = scrollHeight - scrollTop - clientHeight < 120;
      this.userNearBottom = nearBottom;
      if (!nearBottom) this.stickToBottom = false;
    });

    this.chatTitleBtn?.addEventListener('click', () => this.renameChat());

    document.getElementById('setup-open-settings')?.addEventListener('click', () => {
      if (this.onOpenSettings) this.onOpenSettings();
    });

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
    state.on('settings-changed', () => this.updateHeader());
    state.on('follow-ups-updated', () => this.handleFollowUpsUpdated());

    this.render();
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

      if (this.mobileProvider) this.mobileProvider.textContent = providerInfo.name;
      if (this.mobileModel) this.mobileModel.textContent = settings.model || 'Select model';
      if (this.topnavStatusText) {
        this.topnavStatusText.textContent = `${providerInfo.name}, ${settings.model || 'Select model'}`;
      }
    } else {
      this.headerProviderName.textContent = 'No provider';
      this.headerModel.textContent = 'Select model';
      if (this.mobileProvider) this.mobileProvider.textContent = 'No provider';
      if (this.mobileModel) this.mobileModel.textContent = 'Select model';
      if (this.topnavStatusText) this.topnavStatusText.textContent = 'Configure model';
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
      const header = col.querySelector('.compare-column-header');
      if (header?.textContent === model || header?.textContent === msg.compareModel) {
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
            ${msg.cost ? `<span>$${msg.cost.toFixed(5)}</span>` : ''}
          `;
        }
        break;
      }
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
    el.querySelector('.error-retry-btn')?.addEventListener('click', () => {
      if (this.onRetry) this.onRetry();
    });
  }

  bindMessageActions(el, msg, index) {
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

    this.bindErrorActions(el, index);
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
    wrap.setAttribute('data-compare-id', messages[0]?.compareId || '');
    wrap.innerHTML = `<div class="compare-group-label">Model comparison</div><div class="compare-columns"></div>`;
    const cols = wrap.querySelector('.compare-columns');

    messages.forEach((msg) => {
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

    const actionsHtml = `
      <div class="message-actions">
        <button type="button" class="msg-action-btn copy-msg-btn">Copy</button>
        ${msg.role === 'user'
          ? '<button type="button" class="msg-action-btn edit-msg-btn">Edit</button>'
          : '<button type="button" class="msg-action-btn regen-msg-btn">Regenerate</button>'}
      </div>
    `;

    el.innerHTML = `
      ${messageAvatarHtml(msg.role)}
      <div class="message-body">
        <div class="message-content">
          ${thinkingHtml}
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
    this.announce('Assistant is responding…');

    const wrap = document.createElement('div');
    wrap.className = 'typing-indicator-wrap message assistant message-enter';
    wrap.innerHTML = `
      ${messageAvatarHtml('assistant')}
      <div class="message-body">
        <div class="message-content typing-bubble">
          <span class="typing-text">Thinking…</span>
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
