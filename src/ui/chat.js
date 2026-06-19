import { state } from '../state.js';
import { renderMarkdown } from './markdown.js';
import { PROVIDERS } from '../providers/registry.js';

export class ChatUI {
  constructor(onRegenerate) {
    this.messagesContainer = document.getElementById('messages');
    this.welcomeContainer = document.getElementById('welcome');
    this.headerProviderBadge = document.getElementById('provider-badge');
    this.headerProviderName = document.getElementById('header-provider');
    this.headerModel = document.getElementById('header-model');
    this.clearChatBtn = document.getElementById('clear-chat-btn');
    
    this.onRegenerate = onRegenerate;

    this.init();
  }

  init() {
    this.clearChatBtn.addEventListener('click', () => {
      const activeChat = state.getActiveChat();
      if (activeChat && activeChat.messages.length > 0) {
        if (confirm('Clear all messages in this conversation?')) {
          state.clearChat(activeChat.id);
        }
      }
    });

    // Handle Quick Action prompt clicks
    document.querySelectorAll('.quick-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        const input = document.getElementById('message-input');
        if (input) {
          input.value = prompt;
          input.dispatchEvent(new Event('input'));
          // Auto send
          const sendBtn = document.getElementById('send-btn');
          if (sendBtn && !sendBtn.disabled) {
            sendBtn.click();
          }
        }
      });
    });

    state.on('chat-switched', () => this.render());
    state.on('chat-cleared', () => this.render());
    state.on('message-added', () => this.render());
    state.on('settings-changed', () => this.updateHeader());

    this.render();
  }

  updateHeader() {
    const settings = state.settings;
    const providerInfo = PROVIDERS[settings.provider];
    
    if (providerInfo) {
      this.headerProviderName.innerText = providerInfo.name;
      this.headerProviderBadge.style.display = 'inline-flex';
      this.headerProviderBadge.style.color = providerInfo.color;
      this.headerProviderBadge.style.backgroundColor = `${providerInfo.color}15`;
      const dot = this.headerProviderBadge.querySelector('.provider-dot');
      if (dot) dot.style.backgroundColor = providerInfo.color;
      
      this.headerModel.innerText = settings.model || 'Select a model';
    } else {
      this.headerProviderBadge.style.display = 'none';
      this.headerModel.innerText = 'Select a provider and model';
    }
  }

  render() {
    this.updateHeader();
    const activeChat = state.getActiveChat();
    
    // Clear dynamic messages (leaving the welcome container)
    const messageElements = this.messagesContainer.querySelectorAll('.message, .typing-indicator-wrap');
    messageElements.forEach(el => el.remove());

    if (!activeChat || activeChat.messages.length === 0) {
      this.welcomeContainer.style.display = 'flex';
      return;
    }

    this.welcomeContainer.style.display = 'none';

    activeChat.messages.forEach((msg, idx) => {
      const msgEl = this.createMessageElement(msg, idx);
      this.messagesContainer.appendChild(msgEl);
    });

    this.scrollToBottom();
  }

  createMessageElement(msg, index) {
    const el = document.createElement('div');
    el.className = `message ${msg.role}`;
    el.setAttribute('data-index', index);

    const avatar = msg.role === 'user' ? 'U' : 'AI';
    const isAssistant = msg.role === 'assistant';

    // Thinking Block (reasoning)
    let thinkingHtml = '';
    if (isAssistant && msg.thinking) {
      // Toggle logic for showing/hiding thinking
      thinkingHtml = `
        <div class="thinking-block">
          <div class="thinking-header" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('hidden')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
            Reasoning Process
          </div>
          <div class="thinking-content">${this.escapeHtml(msg.thinking)}</div>
        </div>
      `;
    }

    // Cost/Latency Metadata
    let metaHtml = '';
    if (isAssistant && (msg.latency || msg.tokens || msg.cost)) {
      const parts = [];
      if (msg.latency) parts.push(`<span class="meta-item">⏱ ${msg.latency}s</span>`);
      if (msg.tokens) {
        parts.push(`<span class="meta-item">📊 ${msg.tokens.total_tokens || msg.tokens} tokens</span>`);
      }
      if (msg.cost !== undefined && msg.cost !== null) {
        parts.push(`<span class="meta-item">💰 $${msg.cost.toFixed(5)}</span>`);
      }
      if (parts.length > 0) {
        metaHtml = `<div class="message-meta">${parts.join('')}</div>`;
      }
    }

    // Actions
    let actionsHtml = '';
    if (isAssistant) {
      actionsHtml = `
        <div class="message-actions">
          <button class="msg-action-btn copy-msg-btn" title="Copy response">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
          </button>
          <button class="msg-action-btn regen-msg-btn" title="Regenerate response">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Regenerate
          </button>
        </div>
      `;
    }

    el.innerHTML = `
      <div class="message-avatar">${avatar}</div>
      <div class="message-body">
        <div class="message-content">
          ${thinkingHtml}
          <div class="markdown-body">${msg.isStreaming ? this.renderStreaming(msg.content) : renderMarkdown(msg.content)}</div>
        </div>
        ${metaHtml}
        ${actionsHtml}
      </div>
    `;

    // Hook copy and regenerate
    if (isAssistant) {
      const copyBtn = el.querySelector('.copy-msg-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(msg.content).then(() => {
            copyBtn.innerHTML = `
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Copied!
            `;
            setTimeout(() => {
              copyBtn.innerHTML = `
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              `;
            }, 2000);
          });
        });
      }

      const regenBtn = el.querySelector('.regen-msg-btn');
      if (regenBtn && this.onRegenerate) {
        regenBtn.addEventListener('click', () => {
          this.onRegenerate();
        });
      }
    }

    return el;
  }

  renderStreaming(content) {
    if (!content) {
      return '<span class="streaming-cursor"></span>';
    }
    // Renders the incomplete markdown safely
    return renderMarkdown(content) + '<span class="streaming-cursor"></span>';
  }

  showTypingIndicator() {
    this.removeTypingIndicator();
    this.welcomeContainer.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = 'typing-indicator-wrap message assistant';
    wrap.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-body">
        <div class="message-content" style="background: var(--surface); padding: 8px 12px; max-width: 80px;">
          <div class="typing-indicator">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    `;
    this.messagesContainer.appendChild(wrap);
    this.scrollToBottom();
  }

  removeTypingIndicator() {
    const wrap = this.messagesContainer.querySelector('.typing-indicator-wrap');
    if (wrap) wrap.remove();
  }

  scrollToBottom() {
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
