import { state, createId } from './state.js';
import { SidebarUI } from './ui/sidebar.js';
import { ChatUI } from './ui/chat.js';
import { InputUI } from './ui/input.js';
import { SettingsUI } from './ui/settings.js';
import { ShortcutsUI } from './ui/shortcuts.js';
import { createProvider, estimateCost } from './providers/registry.js';
import { generateFollowUpQueries, heuristicFollowUps } from './followups.js';
import { iconHtml } from './ui/icons.js';

class App {
  constructor() {
    this.abortController = null;
    this.abortControllers = [];
    this.sidebarUI = null;
    this.chatUI = null;
    this.inputUI = null;
    this.settingsUI = null;
    this.shortcutsUI = null;
    this.lastPrompt = '';
  }

  init() {
    this.settingsUI = new SettingsUI();
    this.sidebarUI = new SidebarUI();
    this.chatUI = new ChatUI(
      () => this.handleRegenerate(),
      () => this.handleRetry(),
      () => this.settingsUI.expandPanel(),
      (prompt) => this.handleSend(prompt),
    );
    this.inputUI = new InputUI(
      (prompt) => this.handleSend(prompt),
      () => this.handleStop()
    );

    this.shortcutsUI = new ShortcutsUI({
      focusInput: () => this.inputUI.focus(),
      focusSearch: () => document.getElementById('chat-search')?.focus(),
      toggleSettings: () => this.settingsUI.togglePanel(),
      newChat: () => state.createNewChat(),
      send: () => this.inputUI.triggerSend(),
      onEscape: () => this.handleStop(),
    });

    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      this.sidebarUI.toggleSidebar();
    });

    document.getElementById('topnav-settings-btn')?.addEventListener('click', () => {
      this.settingsUI.togglePanel();
    });
    document.getElementById('sidebar-settings-btn')?.addEventListener('click', () => {
      this.settingsUI.expandPanel();
    });
    document.getElementById('topnav-status-btn')?.addEventListener('click', () => {
      this.settingsUI.expandPanel();
    });
    document.getElementById('input-settings-btn')?.addEventListener('click', () => {
      this.settingsUI.expandPanel();
    });
    document.getElementById('topnav-help-btn')?.addEventListener('click', () => {
      this.shortcutsUI.togglePanel();
    });

    document.querySelectorAll('.provider-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const provider = btn.dataset.provider;
        const select = document.getElementById('provider-select');
        if (provider && select) {
          select.value = provider;
          select.dispatchEvent(new Event('change'));
        }
        this.settingsUI.expandPanel();
      });
    });

    this.applyTheme(state.settings.theme || 'light');
    document.getElementById('theme-toggle-btn')?.addEventListener('click', () => this.toggleTheme());

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (state.settings.theme === 'system') {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });

    state.on('settings-changed', (settings) => {
      if (settings.theme) this.applyTheme(settings.theme);
    });
  }

  toggleTheme() {
    const next = state.settings.theme === 'dark' ? 'light' : 'dark';
    state.updateSettings({ theme: next });
    this.applyTheme(next);
  }

  applyTheme(theme) {
    let activeTheme = theme;
    if (theme === 'system') {
      activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.setAttribute('data-theme', activeTheme);

    const label = document.getElementById('theme-label');
    if (label) label.textContent = activeTheme === 'dark' ? 'Dark mode' : 'Light mode';

    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
      const iconName = activeTheme === 'dark' ? 'moon' : 'sun';
      themeIcon.outerHTML = iconHtml(iconName, { className: 'icon icon-theme' })
        .replace('<svg', '<svg id="theme-icon"');
    }
  }

  async handleSend(prompt) {
    if (this.abortController || this.abortControllers.length > 0) return;

    this.lastPrompt = prompt;
    const activeChat = state.getActiveChat();
    if (!activeChat) return;

    if (!state.isConfigured()) {
      this.showToast('Configure provider and API key in settings.', true);
      this.settingsUI.expandPanel();
      return;
    }

    const settings = state.settings;
    const key = state.getApiKey(settings.provider);
    if (!key && settings.provider !== 'openrouter') {
      this.showToast('Add your API key in settings.', true);
      this.settingsUI.expandPanel();
      return;
    }

    state.addMessage(activeChat.id, {
      role: 'user',
      content: prompt,
      createdAt: Date.now(),
    });
    state.clearFollowUpSuggestions(activeChat.id);

    if (settings.compareMode && settings.compareModels?.length > 0) {
      await this.executeCompareResponse(activeChat.id, prompt);
    } else {
      await this.executeStreamingResponse(activeChat.id);
    }
  }

  async handleRegenerate() {
    const activeChat = state.getActiveChat();
    if (!activeChat || activeChat.messages.length === 0) return;

    while (activeChat.messages.length > 0) {
      const last = activeChat.messages[activeChat.messages.length - 1];
      if (last.role === 'assistant' || last.compareId) {
        state.removeLastMessage(activeChat.id);
      } else break;
    }

    const settings = state.settings;
    const lastUser = [...activeChat.messages].reverse().find(m => m.role === 'user');
    if (settings.compareMode && settings.compareModels?.length > 0 && lastUser) {
      await this.executeCompareResponse(activeChat.id, lastUser.content);
    } else {
      await this.executeStreamingResponse(activeChat.id);
    }
  }

  async handleRetry() {
    const activeChat = state.getActiveChat();
    if (!activeChat) return;
    const lastMsg = activeChat.messages[activeChat.messages.length - 1];
    if (lastMsg?.role === 'assistant') state.removeLastMessage(activeChat.id);
    await this.executeStreamingResponse(activeChat.id);
  }

  async executeCompareResponse(chatId, prompt) {
    const settings = state.settings;
    const models = settings.compareModels.slice(0, 3);
    const compareId = createId();
    const key = state.getApiKey(settings.provider);

    this.inputUI.setLoading(true);
    this.chatUI.showTypingIndicator();

    models.forEach(model => {
      state.addMessage(chatId, {
        role: 'assistant',
        content: '',
        compareId,
        compareModel: model,
        model,
        isStreaming: true,
        createdAt: Date.now(),
      });
    });

    this.chatUI.beginAssistantResponse();
    this.chatUI.render({ animate: false });

    this.abortControllers = models.map(() => new AbortController());

    const tasks = models.map((model, i) => this.streamSingleModel(chatId, compareId, model, key, this.abortControllers[i].signal));

    try {
      await Promise.all(tasks);
    } finally {
      this.inputUI.setLoading(false);
      this.chatUI.render({ animate: false });
      this.chatUI.scrollToBottom(true);
      this.abortControllers = [];
    }
  }

  async streamSingleModel(chatId, compareId, model, key, signal) {
    const settings = { ...state.settings, model };
    const provider = createProvider(settings.provider, key, settings.corsProxyUrl);
    const chat = state.getActiveChat();
    const history = chat.messages
      .filter(m => !m.compareId)
      .map(m => ({ role: m.role, content: m.content }));

    let fullText = '';
    let fullThinking = '';
    const startTime = Date.now();

    try {
      const stream = provider.streamChat(history, settings, signal);
      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullText += chunk.content;
          state.updateCompareMessage(chatId, compareId, model, fullText, { thinking: fullThinking, isStreaming: true });
          const msg = state.getActiveChat()?.messages.find(m => m.compareId === compareId && m.compareModel === model);
          if (msg) this.chatUI.updateCompareMessage(compareId, model, msg);
        } else if (chunk.type === 'thinking') {
          fullThinking += chunk.content;
          state.updateCompareMessage(chatId, compareId, model, fullText, { thinking: fullThinking, isStreaming: true });
        } else if (chunk.type === 'usage') {
          const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
          const cost = estimateCost(model, chunk.usage.prompt_tokens, chunk.usage.completion_tokens);
          state.updateCompareMessage(chatId, compareId, model, fullText, {
            tokens: chunk.usage,
            cost,
            latency,
            thinking: fullThinking,
          });
          state.recordUsage(settings.provider, chunk.usage.total_tokens, cost || 0);
        }
      }

      const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
      if (!fullText) fullText = '(No response)';

      state.updateCompareMessage(chatId, compareId, model, fullText, {
        isStreaming: false,
        latency,
        thinking: fullThinking,
      });
    } catch (e) {
      if (e.name !== 'AbortError') {
        state.updateCompareMessage(chatId, compareId, model, e.message, {
          isStreaming: false,
          isError: true,
        });
      }
    }
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

    const history = activeChat.messages.map(m => ({ role: m.role, content: m.content }));

    state.addMessage(chatId, {
      role: 'assistant',
      content: '',
      model: settings.model,
      isStreaming: true,
      createdAt: Date.now(),
    });

    this.chatUI.beginAssistantResponse();
    const assistantIndex = state.getActiveChat().messages.length - 1;

    let fullText = '';
    let fullThinking = '';
    const startTime = Date.now();

    try {
      const stream = provider.streamChat(history, settings, this.abortController.signal);

      for await (const chunk of stream) {
        if (chunk.type === 'text') {
          fullText += chunk.content;
          state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking });
          const msg = state.getActiveChat()?.messages[assistantIndex];
          if (msg) this.chatUI.updateMessageAt(assistantIndex, msg);
        } else if (chunk.type === 'thinking') {
          fullThinking += chunk.content;
          state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking });
          const msg = state.getActiveChat()?.messages[assistantIndex];
          if (msg) this.chatUI.updateMessageAt(assistantIndex, msg);
        } else if (chunk.type === 'usage') {
          const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
          const cost = estimateCost(settings.model, chunk.usage.prompt_tokens, chunk.usage.completion_tokens);
          state.updateLastAssistantMessage(chatId, fullText, {
            tokens: chunk.usage,
            cost,
            latency,
            thinking: fullThinking,
          });
          state.recordUsage(settings.provider, chunk.usage.total_tokens, cost || 0);
        }
      }

      const latency = parseFloat(((Date.now() - startTime) / 1000).toFixed(2));
      const lastMsg = activeChat.messages[activeChat.messages.length - 1];

      if (lastMsg && !lastMsg.tokens) {
        const promptText = history.map(h => h.content).join(' ');
        const promptTokens = Math.ceil(promptText.split(/\s+/).length * 1.3);
        const completionTokens = Math.ceil(fullText.split(/\s+/).length * 1.3);
        const cost = estimateCost(settings.model, promptTokens, completionTokens);
        state.updateLastAssistantMessage(chatId, fullText, {
          tokens: { prompt_tokens: promptTokens, completion_tokens: completionTokens, total_tokens: promptTokens + completionTokens },
          cost,
          latency,
          thinking: fullThinking,
        });
        state.recordUsage(settings.provider, promptTokens + completionTokens, cost || 0);
      }

      if (lastMsg) lastMsg.isStreaming = false;
      const finalMsg = state.getActiveChat()?.messages[assistantIndex];
      if (finalMsg) this.chatUI.updateMessageAt(assistantIndex, finalMsg);
      this.chatUI.announce('Response complete');

      const lastAssistant = activeChat.messages[activeChat.messages.length - 1];
      if (lastAssistant?.role === 'assistant' && !lastAssistant.isError && fullText) {
        const lastUser = [...activeChat.messages].reverse().find(m => m.role === 'user');
        if (lastUser) {
          this.generateFollowUps(chatId, lastUser.content, fullText);
        }
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        this.showToast('Generation stopped.');
      } else {
        state.updateLastAssistantMessage(chatId, e.message, { isError: true });
      }
      const msg = activeChat.messages[assistantIndex];
      if (msg) msg.isStreaming = false;
      if (msg) this.chatUI.updateMessageAt(assistantIndex, msg);
    } finally {
      this.inputUI.setLoading(false);
      this.chatUI.scrollToBottom(true);
      this.abortController = null;
    }
  }

  handleStop() {
    if (this.abortController) this.abortController.abort();
    this.abortControllers.forEach(c => c.abort());
  }

  async generateFollowUps(chatId, userQuestion, assistantResponse) {
    if (state.settings.compareMode) return;

    const chat = state.getActiveChat();
    if (!chat || chat.id !== chatId) return;

    state.setFollowUpsLoading(chatId, true);

    try {
      const settings = state.settings;
      const key = state.getApiKey(settings.provider);
      const provider = createProvider(settings.provider, key, settings.corsProxyUrl);
      const suggestions = await generateFollowUpQueries(
        provider,
        userQuestion,
        assistantResponse,
        settings,
      );
      if (state.getActiveChat()?.id === chatId) {
        state.setFollowUpSuggestions(chatId, suggestions);
      }
    } catch {
      if (state.getActiveChat()?.id === chatId) {
        state.setFollowUpSuggestions(chatId, heuristicFollowUps(userQuestion));
      }
    }
  }

  showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = 'toast visible';
    if (isError) toast.style.borderColor = 'var(--error)';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
}

const app = new App();
window.addEventListener('DOMContentLoaded', () => app.init());
export default app;
