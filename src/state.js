// ========================================
// State Manager — Reactive state with localStorage persistence
// ========================================

const STORAGE_KEY = 'ai-playground-state';

const defaultSettings = {
  provider: '',
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  topP: 1.0,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: '',
  reasoningMode: false,
  reasoningEffort: 'medium',
  theme: 'light',
  corsProxyUrl: '',
  compareMode: false,
  compareModels: [],
  activePreset: '',
  activeSystemPromptPreset: '',
};

function createId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function createChat(title = 'New Chat') {
  return {
    id: createId(),
    title,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tokenUsage: { prompt: 0, completion: 0, total: 0 },
    totalCost: 0,
    followUpSuggestions: [],
    followUpsLoading: false,
    pinned: false,
    archived: false,
    folderId: '',
  };
}

function createFolder(name = 'New Folder') {
  return { id: createId(), name, createdAt: Date.now() };
}

class StateManager {
  constructor() {
    this._listeners = new Map();
    this._state = this._loadState();
    if (Object.keys(this._state.chats).length === 0) {
      const chat = createChat();
      this._state.chats[chat.id] = chat;
      this._state.activeChat = chat.id;
    }
  }

  _loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const chats = parsed.chats || {};
        Object.values(chats).forEach(chat => {
          if (chat.pinned === undefined) chat.pinned = false;
          if (chat.archived === undefined) chat.archived = false;
          if (chat.folderId === undefined) chat.folderId = '';
        });
        return {
          activeChat: parsed.activeChat || '',
          chats,
          settings: { ...defaultSettings, ...parsed.settings },
          apiKeys: parsed.apiKeys || {},
          usage: parsed.usage || { daily: {}, total: { requests: 0, tokens: 0, cost: 0 } },
          folders: parsed.folders || [],
          promptLibrary: parsed.promptLibrary || [],
          sidebarFilter: parsed.sidebarFilter || 'all',
        };
      }
    } catch (e) {
      console.warn('Failed to load state:', e);
    }
    return {
      activeChat: '',
      chats: {},
      settings: { ...defaultSettings },
      apiKeys: {},
      usage: { daily: {}, total: { requests: 0, tokens: 0, cost: 0 } },
      folders: [],
      promptLibrary: [],
      sidebarFilter: 'all',
    };
  }

  _saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    } catch (e) {
      console.warn('Failed to save state:', e);
    }
  }

  flushSave() {
    this._saveState();
  }

  _emit(event, data) {
    const listeners = this._listeners.get(event) || [];
    listeners.forEach(fn => fn(data));
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, []);
    this._listeners.get(event).push(fn);
    return () => {
      const arr = this._listeners.get(event);
      const idx = arr.indexOf(fn);
      if (idx > -1) arr.splice(idx, 1);
    };
  }

  get settings() { return this._state.settings; }
  get chats() { return this._state.chats; }
  get activeChat() { return this._state.activeChat; }
  get apiKeys() { return this._state.apiKeys; }
  get usage() { return this._state.usage; }
  get folders() { return this._state.folders; }
  get promptLibrary() { return this._state.promptLibrary; }
  get sidebarFilter() { return this._state.sidebarFilter; }

  getActiveChat() {
    return this._state.chats[this._state.activeChat] || null;
  }

  getChatList({ includeArchived = false } = {}) {
    return Object.values(this._state.chats)
      .filter(c => includeArchived || !c.archived)
      .sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return b.updatedAt - a.updatedAt;
      });
  }

  setSidebarFilter(filter) {
    this._state.sidebarFilter = filter;
    this._saveState();
    this._emit('sidebar-filter-changed', filter);
  }

  pinChat(chatId, pinned = true) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.pinned = pinned;
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('chat-updated', chatId);
  }

  archiveChat(chatId, archived = true) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.archived = archived;
    if (archived) chat.pinned = false;
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('chat-updated', chatId);
  }

  moveChatToFolder(chatId, folderId) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.folderId = folderId || '';
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('chat-updated', chatId);
  }

  createFolder(name) {
    const folder = createFolder(name.trim() || 'New Folder');
    this._state.folders.push(folder);
    this._saveState();
    this._emit('folders-changed');
    return folder;
  }

  renameFolder(folderId, name) {
    const folder = this._state.folders.find(f => f.id === folderId);
    if (!folder || !name.trim()) return;
    folder.name = name.trim();
    this._saveState();
    this._emit('folders-changed');
  }

  deleteFolder(folderId) {
    this._state.folders = this._state.folders.filter(f => f.id !== folderId);
    Object.values(this._state.chats).forEach(c => {
      if (c.folderId === folderId) c.folderId = '';
    });
    this._saveState();
    this._emit('folders-changed');
    this._emit('chat-updated');
  }

  addPrompt({ label, prompt, tags = [] }) {
    const entry = { id: createId(), label: label.trim(), prompt: prompt.trim(), tags, createdAt: Date.now() };
    this._state.promptLibrary.unshift(entry);
    this._saveState();
    this._emit('prompt-library-changed');
    return entry;
  }

  removePrompt(promptId) {
    this._state.promptLibrary = this._state.promptLibrary.filter(p => p.id !== promptId);
    this._saveState();
    this._emit('prompt-library-changed');
  }

  updatePrompt(promptId, partial) {
    const entry = this._state.promptLibrary.find(p => p.id === promptId);
    if (!entry) return;
    Object.assign(entry, partial);
    this._saveState();
    this._emit('prompt-library-changed');
  }

  pickCompareResponse(chatId, compareId, model) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    const picked = chat.messages.find(m => m.compareId === compareId && m.compareModel === model);
    if (!picked) return;
    chat.messages = chat.messages.filter(m => m.compareId !== compareId);
    chat.messages.push({
      role: 'assistant',
      content: picked.content,
      model: picked.compareModel || picked.model,
      thinking: picked.thinking,
      tokens: picked.tokens,
      cost: picked.cost,
      latency: picked.latency,
      createdAt: Date.now(),
    });
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('compare-picked', { chatId, model });
  }

  isConfigured() {
    const s = this._state.settings;
    if (!s.provider || !s.model) return false;
    if (s.provider === 'openrouter') return true;
    return !!this.getApiKey(s.provider);
  }

  getSessionCost(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat) return 0;
    return chat.messages.reduce((sum, m) => sum + (m.cost || 0), 0);
  }

  updateSettings(partial) {
    this._state.settings = { ...this._state.settings, ...partial };
    this._saveState();
    this._emit('settings-changed', this._state.settings);
  }

  setApiKey(provider, key) {
    this._state.apiKeys[provider] = key ? btoa('aipg_' + key) : '';
    this._saveState();
    this._emit('apikey-changed', { provider, hasKey: !!key });
  }

  getApiKey(provider) {
    const encoded = this._state.apiKeys[provider];
    if (!encoded) return '';
    try {
      const decoded = atob(encoded);
      return decoded.startsWith('aipg_') ? decoded.slice(5) : decoded;
    } catch {
      return '';
    }
  }

  setActiveChat(chatId) {
    if (this._state.chats[chatId]) {
      this._state.activeChat = chatId;
      this._saveState();
      this._emit('chat-switched', chatId);
    }
  }

  createNewChat() {
    const chat = createChat();
    this._state.chats[chat.id] = chat;
    this._state.activeChat = chat.id;
    this._saveState();
    this._emit('chat-created', chat);
    this._emit('chat-switched', chat.id);
    return chat;
  }

  duplicateChat(chatId) {
    const source = this._state.chats[chatId];
    if (!source) return null;
    const chat = createChat(`${source.title} (copy)`);
    chat.messages = JSON.parse(JSON.stringify(source.messages));
    chat.totalCost = source.totalCost;
    this._state.chats[chat.id] = chat;
    this._state.activeChat = chat.id;
    this._saveState();
    this._emit('chat-created', chat);
    this._emit('chat-switched', chat.id);
    return chat;
  }

  renameChat(chatId, title) {
    const chat = this._state.chats[chatId];
    if (!chat || !title.trim()) return;
    chat.title = title.trim();
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('chat-renamed', { chatId, title: chat.title });
  }

  deleteChat(chatId) {
    delete this._state.chats[chatId];
    if (this._state.activeChat === chatId) {
      const remaining = this.getChatList();
      if (remaining.length > 0) {
        this._state.activeChat = remaining[0].id;
      } else {
        const chat = createChat();
        this._state.chats[chat.id] = chat;
        this._state.activeChat = chat.id;
      }
    }
    this._saveState();
    this._emit('chat-deleted', chatId);
    this._emit('chat-switched', this._state.activeChat);
  }

  addMessage(chatId, message) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.messages.push(message);
    chat.updatedAt = Date.now();
    if (chat.title === 'New Chat' && message.role === 'user') {
      chat.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
    }
    if (message.cost) chat.totalCost = (chat.totalCost || 0) + message.cost;
    this._saveState();
    this._emit('message-added', { chatId, message });
  }

  clearFollowUpSuggestions(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.followUpSuggestions = [];
    chat.followUpsLoading = false;
    this._saveState();
    this._emit('follow-ups-updated', { chatId });
  }

  setFollowUpsLoading(chatId, loading) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.followUpsLoading = loading;
    if (!loading && !chat.followUpSuggestions) chat.followUpSuggestions = [];
    this._emit('follow-ups-updated', { chatId });
  }

  setFollowUpSuggestions(chatId, suggestions) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.followUpSuggestions = (suggestions || []).slice(0, 3);
    chat.followUpsLoading = false;
    this._saveState();
    this._emit('follow-ups-updated', { chatId });
  }

  updateLastAssistantMessage(chatId, content, meta = {}) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    const lastMsg = [...chat.messages].reverse().find(m => m.role === 'assistant' && !m.compareModel);
    if (lastMsg) {
      lastMsg.content = content;
      if (meta.tokens) lastMsg.tokens = meta.tokens;
      if (meta.cost !== undefined) lastMsg.cost = meta.cost;
      if (meta.latency !== undefined) lastMsg.latency = meta.latency;
      if (meta.thinking !== undefined) lastMsg.thinking = meta.thinking;
      if (meta.isError) lastMsg.isError = meta.isError;
      if (meta.model) lastMsg.model = meta.model;
      chat.updatedAt = Date.now();
      if (!meta.skipSave) this._saveState();
    }
  }

  updateCompareMessage(chatId, compareId, model, content, meta = {}) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    const msg = chat.messages.find(m => m.compareId === compareId && m.compareModel === model);
    if (msg) {
      msg.content = content;
      if (meta.tokens) msg.tokens = meta.tokens;
      if (meta.cost !== undefined) msg.cost = meta.cost;
      if (meta.latency !== undefined) msg.latency = meta.latency;
      if (meta.thinking !== undefined) msg.thinking = meta.thinking;
      if (meta.isStreaming !== undefined) msg.isStreaming = meta.isStreaming;
      if (meta.isError) msg.isError = meta.isError;
      chat.updatedAt = Date.now();
      this._saveState();
    }
  }

  removeLastMessage(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat || chat.messages.length === 0) return null;
    const removed = chat.messages.pop();
    this._saveState();
    return removed;
  }

  truncateMessagesAfter(chatId, index) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.messages = chat.messages.slice(0, index + 1);
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('messages-truncated', { chatId, index });
  }

  editUserMessage(chatId, index, newContent) {
    const chat = this._state.chats[chatId];
    if (!chat || !chat.messages[index]) return;
    chat.messages[index].content = newContent;
    chat.messages = chat.messages.slice(0, index + 1);
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('message-edited', { chatId, index });
  }

  clearChat(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat) return;
    chat.messages = [];
    chat.tokenUsage = { prompt: 0, completion: 0, total: 0 };
    chat.totalCost = 0;
    chat.title = 'New Chat';
    chat.updatedAt = Date.now();
    this._saveState();
    this._emit('chat-cleared', chatId);
  }

  recordUsage(provider, tokens, cost) {
    const today = new Date().toISOString().slice(0, 10);
    if (!this._state.usage.daily[today]) {
      this._state.usage.daily[today] = { requests: 0, tokens: 0, cost: 0, byProvider: {} };
    }
    const day = this._state.usage.daily[today];
    day.requests += 1;
    day.tokens += tokens || 0;
    day.cost += cost || 0;
    if (!day.byProvider[provider]) day.byProvider[provider] = { requests: 0, tokens: 0, cost: 0 };
    day.byProvider[provider].requests += 1;
    day.byProvider[provider].tokens += tokens || 0;
    day.byProvider[provider].cost += cost || 0;

    this._state.usage.total.requests += 1;
    this._state.usage.total.tokens += tokens || 0;
    this._state.usage.total.cost += cost || 0;
    this._saveState();
    this._emit('usage-updated', this._state.usage);
  }

  getUsageStats() {
    return this._state.usage;
  }

  exportChat(chatId) {
    const chat = this._state.chats[chatId];
    if (!chat) return null;
    return JSON.stringify({ chat, exportedAt: Date.now() }, null, 2);
  }

  exportAllChats() {
    return JSON.stringify({
      chats: this._state.chats,
      settings: { ...this._state.settings },
      exportedAt: Date.now(),
    }, null, 2);
  }

  exportSettings() {
    const { ...settings } = this._state.settings;
    return JSON.stringify({ settings, exportedAt: Date.now() }, null, 2);
  }

  importChats(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.chats) {
        Object.assign(this._state.chats, data.chats);
      } else if (data.chat) {
        const chat = data.chat;
        chat.id = createId();
        this._state.chats[chat.id] = chat;
      }
      this._saveState();
      this._emit('chats-imported');
      return true;
    } catch {
      return false;
    }
  }

  importSettings(jsonStr) {
    try {
      const data = JSON.parse(jsonStr);
      if (data.settings) {
        this.updateSettings(data.settings);
      }
      return true;
    } catch {
      return false;
    }
  }

  clearAllData() {
    this._state.chats = {};
    this._state.apiKeys = {};
    this._state.usage = { daily: {}, total: { requests: 0, tokens: 0, cost: 0 } };
    this._state.settings = { ...defaultSettings };
    this._state.folders = [];
    this._state.promptLibrary = [];
    this._state.sidebarFilter = 'all';
    const chat = createChat();
    this._state.chats[chat.id] = chat;
    this._state.activeChat = chat.id;
    this._saveState();
    this._emit('data-cleared');
    this._emit('chat-switched', chat.id);
    this._emit('settings-changed', this._state.settings);
  }
}

export const state = new StateManager();
export { createId };
