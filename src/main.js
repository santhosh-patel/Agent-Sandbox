import { state } from './state.js';
import { SidebarUI } from './ui/sidebar.js';
import { ChatUI } from './ui/chat.js';
import { InputUI } from './ui/input.js';
import { SettingsUI } from './ui/settings.js';
import { createProvider, estimateCost } from './providers/registry.js';

class App {
  constructor() {
    this.abortController = null;
    this.sidebarUI = null;
    this.chatUI = null;
    this.inputUI = null;
    this.settingsUI = null;
  }

  init() {
    // Initial UI Setup
    this.sidebarUI = new SidebarUI();
    this.chatUI = new ChatUI(() => this.handleRegenerate());
    this.inputUI = new InputUI(
      (prompt) => this.handleSend(prompt),
      () => this.handleStop()
    );
    this.settingsUI = new SettingsUI();

    // Hook mobile sidebar toggle buttons
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', () => {
        this.sidebarUI.expandSidebar();
      });
    }

    // Set theme on launch
    this.applyTheme(state.settings.theme || 'dark');
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Check system preference for theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (state.settings.theme === 'system') {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });

    state.on('settings-changed', (settings) => {
      if (settings.theme) {
        this.applyTheme(settings.theme);
      }
    });
  }

  toggleTheme() {
    const current = state.settings.theme;
    const next = current === 'dark' ? 'light' : 'dark';
    state.updateSettings({ theme: next });
    this.applyTheme(next);
  }

  applyTheme(theme) {
    let activeTheme = theme;
    if (theme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    document.documentElement.setAttribute('data-theme', activeTheme);
    
    // Update footer button UI
    const label = document.getElementById('theme-label');
    const icon = document.getElementById('theme-icon');
    if (label) label.innerText = activeTheme === 'dark' ? 'Light' : 'Dark';
    if (icon) {
      if (activeTheme === 'dark') {
        icon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707M12 5a7 7 0 100 14 7 7 0 000-14z"/>';
      } else {
        icon.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
      }
    }
  }

  async handleSend(prompt) {
    const activeChat = state.getActiveChat();
    if (!activeChat) return;

    const settings = state.settings;
    if (!settings.provider || !settings.model) {
      this.showToast('Please select a provider and model in settings first.', true);
      this.settingsUI.openPanel();
      return;
    }

    const key = state.getApiKey(settings.provider);
    if (!key && settings.provider !== 'openrouter') {
      this.showToast('Please configure your API key for this provider.', true);
      this.settingsUI.openPanel();
      return;
    }

    // Add user message to state
    state.addMessage(activeChat.id, {
      role: 'user',
      content: prompt,
      createdAt: Date.now(),
    });

    this.executeStreamingResponse(activeChat.id);
  }

  async handleRegenerate() {
    const activeChat = state.getActiveChat();
    if (!activeChat || activeChat.messages.length === 0) return;

    // Remove last message if it's from assistant
    const lastMsg = activeChat.messages[activeChat.messages.length - 1];
    if (lastMsg && lastMsg.role === 'assistant') {
      state.removeLastMessage(activeChat.id);
      this.chatUI.render();
    }

    this.executeStreamingResponse(activeChat.id);
  }

  async executeStreamingResponse(chatId) {
    this.abortController = new AbortController();
    this.inputUI.setLoading(true);
    this.chatUI.showTypingIndicator();

    const activeChat = state.getActiveChat();
    if (!activeChat) return;

    const settings = state.settings;
    const key = state.getApiKey(settings.provider);
    const provider = createProvider(settings.provider, key, settings.corsProxyUrl);

    // Filter messages up to the current ones
    const history = activeChat.messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

    // Create container for assistant response
    state.addMessage(chatId, {
      role: 'assistant',
      content: '',
      isStreaming: true,
      createdAt: Date.now(),
    });

    this.chatUI.removeTypingIndicator();
    this.chatUI.render();

    let fullText = '';
    let fullThinking = '';
    const startTime = Date.now();

    try {
      const stream = provider.streamChat(history, settings, this.abortController.signal);
      
      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullText += chunk.content;
          state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking });
          this.chatUI.render();
        } else if (chunk.type === 'thinking') {
          fullThinking += chunk.content;
          state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking });
          this.chatUI.render();
        } else if (chunk.type === 'usage') {
          const latency = ((Date.now() - startTime) / 1000).toFixed(2);
          const cost = estimateCost(settings.model, chunk.usage.prompt_tokens, chunk.usage.completion_tokens);
          state.updateLastAssistantMessage(chatId, fullText, {
            tokens: chunk.usage,
            cost: cost,
            latency: parseFloat(latency),
            thinking: fullThinking,
          });
        }
      }

      // Finish streaming status
      const latency = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Calculate token approximation if usage wasn't returned
      const lastMsg = activeChat.messages[activeChat.messages.length - 1];
      if (lastMsg && !lastMsg.tokens) {
        // Approximate token counting
        const promptText = history.map(h => h.content).join(' ');
        const promptTokens = Math.ceil(promptText.split(/\s+/).length * 1.3);
        const completionTokens = Math.ceil(fullText.split(/\s+/).length * 1.3);
        const totalTokens = promptTokens + completionTokens;
        
        const cost = estimateCost(settings.model, promptTokens, completionTokens);
        
        state.updateLastAssistantMessage(chatId, fullText, {
          tokens: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: totalTokens },
          cost: cost,
          latency: parseFloat(latency),
          thinking: fullThinking,
        });
      }

      // Turn off streaming active flag
      const msg = activeChat.messages[activeChat.messages.length - 1];
      if (msg) msg.isStreaming = false;

    } catch (e) {
      if (e.name === 'AbortError') {
        this.showToast('Generation stopped.');
      } else {
        console.error('Streaming error:', e);
        this.showToast(e.message, true);
        state.updateLastAssistantMessage(chatId, `<span style="display: inline-flex; align-items: center; gap: 6px; color: var(--error);"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>**API Error:**</span> ${e.message}`);
      }
      
      const msg = activeChat.messages[activeChat.messages.length - 1];
      if (msg) msg.isStreaming = false;
    } finally {
      this.inputUI.setLoading(false);
      this.chatUI.render();
      this.abortController = null;
    }
  }

  handleStop() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast visible';
    if (isError) toast.style.borderColor = 'var(--error)';
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

// Instantiate and start app on page load
const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
export default app;
