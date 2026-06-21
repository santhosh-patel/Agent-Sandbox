import { state, createId } from './state.js';
import { SidebarUI } from './ui/sidebar.js';
import { ChatUI } from './ui/chat.js';
import { InputUI } from './ui/input.js';
import { SettingsUI } from './ui/settings.js';
import { ShortcutsUI } from './ui/shortcuts.js';
import { HelpUI } from './ui/help.js';
import { PromptLibraryUI } from './ui/prompt-library.js';
import { AttachmentManager } from './ui/attachments.js';
import { createProvider, estimateCost, refreshOpenRouterPricing } from './providers/registry.js';
import { generateFollowUpQueries, heuristicFollowUps } from './followups.js';
import { buildApiHistory } from './chat-history.js';
import { RESPONSE_PROFILES } from './data/presets.js';
import { showToast } from './ui/toast.js';
import { navigate } from './router.js';
import { initTheme } from './shared/theme.js';

export class PlaygroundApp {
  constructor() {
    this.abortController = null;
    this.abortControllers = [];
    this.sidebarUI = null;
    this.chatUI = null;
    this.inputUI = null;
    this.settingsUI = null;
    this.shortcutsUI = null;
    this.helpUI = null;
    this.promptLibraryUI = null;
    this.attachments = null;
    this.lastPrompt = '';
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    this.settingsUI = new SettingsUI();
    refreshOpenRouterPricing();
    this.sidebarUI = new SidebarUI();
    this.chatUI = new ChatUI(
      (options) => this.handleRegenerate(options),
      () => this.handleRetry(),
      () => this.settingsUI.expandPanel(),
      (prompt) => this.handleFollowUpSend(prompt),
      (compareId, model) => this.handlePickCompare(compareId, model),
      () => this.settingsUI.getModelListForPicker(),
    );
    this.inputUI = new InputUI(
      (prompt, images) => this.handleSend(prompt, images),
      () => this.handleStop()
    );

    this.attachments = new AttachmentManager();
    this.inputUI.setAttachmentGetter(() => this.attachments.images);
    const observer = new MutationObserver(() => this.inputUI.refreshSendState());
    if (this.attachments.previewEl) observer.observe(this.attachments.previewEl, { childList: true, attributes: true, attributeFilter: ['hidden'] });

    this.promptLibraryUI = new PromptLibraryUI((prompt) => {
      this.inputUI.setPrompt(prompt);
    });

    this.shortcutsUI = new ShortcutsUI({
      focusInput: () => this.inputUI.focus(),
      focusSearch: () => document.getElementById('chat-search')?.focus(),
      toggleSettings: () => this.settingsUI.togglePanel(),
      newChat: () => state.createNewChat(),
      send: () => this.inputUI.triggerSend(),
      onEscape: () => this.handleStop(),
      onUndo: () => this.handleUndo(),
    });

    this.helpUI = new HelpUI();

    document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
      this.sidebarUI.toggleSidebar();
    });

    document.getElementById('topnav-settings-btn')?.addEventListener('click', () => {
      this.settingsUI.togglePanel();
    });
    document.getElementById('sidebar-settings-btn')?.addEventListener('click', () => {
      this.settingsUI.expandPanel();
    });
    document.getElementById('topnav-status-btn')?.addEventListener('click', () => navigate('/rag'));
    document.getElementById('input-settings-btn')?.addEventListener('click', () => {
      this.settingsUI.expandPanel();
    });
    document.getElementById('topnav-help-btn')?.addEventListener('click', () => {
      this.helpUI.togglePanel();
    });
    document.getElementById('sidebar-help-btn')?.addEventListener('click', () => {
      this.helpUI.togglePanel();
    });
    document.getElementById('mobile-help-btn')?.addEventListener('click', () => {
      this.helpUI.togglePanel();
    });

    this.bindProviderChips();
    initTheme();
    state.on('settings-changed', (settings) => {
      if (settings.provider) this.updateProviderChips();
    });
    this.updateProviderChips();
  }

  bindProviderChips() {
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
  }

  updateProviderChips() {
    const current = state.settings.provider;
    document.querySelectorAll('.provider-chip').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.provider === current);
    });
  }

  mergeStreamSettings(overrides = {}) {
    const chat = state.getActiveChat();
    const base = chat?.settings ? { ...state.settings, ...chat.settings } : state.settings;
    let settings = { ...base };
    if (overrides.model) settings.model = overrides.model;
    if (overrides.responseProfile) {
      const profile = RESPONSE_PROFILES[overrides.responseProfile];
      if (profile) {
        settings = {
          ...settings,
          responseProfile: overrides.responseProfile,
          temperature: profile.temperature,
          topP: profile.topP,
          frequencyPenalty: profile.frequencyPenalty,
          presencePenalty: profile.presencePenalty,
          reasoningMode: profile.reasoningMode || false,
          reasoningEffort: profile.reasoningEffort || 'medium',
          systemPrompt: profile.systemPrompt || settings.systemPrompt,
        };
      }
    }
    return settings;
  }

  handleFollowUpSend(prompt) {
    this.inputUI.setPrompt(prompt);
    this.inputUI.triggerSend();
  }

  handlePickCompare(compareId, model) {
    const chat = state.getActiveChat();
    if (!chat) return;
    state.pickCompareResponse(chat.id, compareId, model);
    if (state.settings.model !== model) {
      state.updateSettings({ model });
    }
    showToast(`Continuing with ${model.split('/').pop()}`);
    this.chatUI.render({ animate: false });
  }

  handleUndo() {
    const chat = state.getActiveChat();
    if (!chat || !state.canUndo(chat.id)) return;
    state.undoLastChange(chat.id);
  }

  async handleSend(prompt, images = []) {
    if (this.abortController || this.abortControllers.length > 0) return;

    const attachedImages = images.length ? images : this.attachments.consume();
    this.lastPrompt = prompt;
    const activeChat = state.getActiveChat();
    if (!activeChat) return;

    if (!state.isConfigured()) {
      showToast('Configure provider and API key in settings.', true);
      this.settingsUI.expandPanel();
      return;
    }

    if (!prompt.trim() && !attachedImages.length) return;

    const settings = this.mergeStreamSettings();
    const key = state.getApiKey(settings.provider);
    if (!key && settings.provider !== 'openrouter') {
      showToast('Add your API key in settings.', true);
      this.settingsUI.expandPanel();
      return;
    }

    state.addMessage(activeChat.id, {
      role: 'user',
      content: prompt,
      images: attachedImages.length ? attachedImages : undefined,
      createdAt: Date.now(),
    });
    this.attachments.clear();
    state.clearFollowUpSuggestions(activeChat.id);

    if (settings.compareMode && settings.compareModels?.length > 0) {
      await this.executeCompareResponse(activeChat.id, prompt);
    } else {
      await this.executeStreamingResponse(activeChat.id);
    }
  }

  async handleRegenerate(options = {}) {
    const activeChat = state.getActiveChat();
    if (!activeChat || activeChat.messages.length === 0) return;

    while (activeChat.messages.length > 0) {
      const last = activeChat.messages[activeChat.messages.length - 1];
      if (last.role === 'assistant' || last.compareId) {
        state.removeLastMessage(activeChat.id);
      } else break;
    }

    const settings = this.mergeStreamSettings();
    const lastUser = [...activeChat.messages].reverse().find(m => m.role === 'user');
    if (settings.compareMode && settings.compareModels?.length > 0 && lastUser) {
      await this.executeCompareResponse(activeChat.id, lastUser.content);
    } else {
      if (options.model || options.responseProfile) {
        const parts = [];
        if (options.model) parts.push(options.model.split('/').pop());
        if (options.responseProfile) parts.push(RESPONSE_PROFILES[options.responseProfile]?.label || options.responseProfile);
        showToast(`Regenerating${parts.length ? ` with ${parts.join(', ')}` : ''}`);
      }
      await this.executeStreamingResponse(activeChat.id, options);
    }
  }

  async handleRetry() {
    const activeChat = state.getActiveChat();
    if (!activeChat) return;
    const lastMsg = activeChat.messages[activeChat.messages.length - 1];
    if (lastMsg?.role === 'assistant') {
      state.pushUndoSnapshot(activeChat.id, 'Before retry');
      state.removeLastMessage(activeChat.id);
    }
    await this.executeStreamingResponse(activeChat.id);
  }

  async executeCompareResponse(chatId, prompt) {
    const settings = this.mergeStreamSettings();
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
      state.maybeAutoTitle(chatId);
    } finally {
      this.inputUI.setLoading(false);
      this.chatUI.render({ animate: false });
      this.chatUI.scrollToBottom(true);
      this.abortControllers = [];
    }
  }

  async streamSingleModel(chatId, compareId, model, key, signal) {
    const settings = { ...this.mergeStreamSettings(), model };
    const provider = createProvider(settings.provider, key, settings.corsProxyUrl);
    const chat = state.getActiveChat();
    const history = buildApiHistory(chat.messages);

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

  async executeStreamingResponse(chatId, overrides = {}) {
    this.abortController = new AbortController();
    this.inputUI.setLoading(true);
    this.chatUI.showTypingIndicator();

    const activeChat = state.getActiveChat();
    if (!activeChat) return;

    const settings = this.mergeStreamSettings(overrides);
    const key = state.getApiKey(settings.provider);
    const provider = createProvider(settings.provider, key, settings.corsProxyUrl);

    const history = buildApiHistory(activeChat.messages);

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
          state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking, skipSave: true, model: settings.model });
          const msg = state.getActiveChat()?.messages[assistantIndex];
          if (msg) this.chatUI.updateMessageAt(assistantIndex, msg);
        } else if (chunk.type === 'thinking') {
          fullThinking += chunk.content;
          state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking, skipSave: true, model: settings.model });
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
            model: settings.model,
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
          model: settings.model,
        });
        state.recordUsage(settings.provider, promptTokens + completionTokens, cost || 0);
      } else {
        state.updateLastAssistantMessage(chatId, fullText, { thinking: fullThinking, model: settings.model });
      }

      if (lastMsg) lastMsg.isStreaming = false;
      state.flushSave();
      state.maybeAutoTitle(chatId);
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
        showToast('Generation stopped.');
      } else {
        state.updateLastAssistantMessage(chatId, e.message, { isError: true });
      }
      const msg = activeChat.messages[assistantIndex];
      if (msg) msg.isStreaming = false;
      state.flushSave();
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
      const settings = this.mergeStreamSettings();
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
}
